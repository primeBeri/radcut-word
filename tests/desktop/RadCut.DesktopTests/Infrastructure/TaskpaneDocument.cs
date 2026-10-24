using System.IO.Packaging;
using System.Xml.Linq;

namespace RadCut.DesktopTests.Infrastructure;

/// <summary>The add-in's id and version, from <c>manifest.xml</c>.</summary>
public sealed record AddinManifest(string Id, string Version)
{
    public static AddinManifest Load(string? path = null)
    {
        var xml = XDocument.Load(path ?? Path.Combine(HarnessPaths.RepoRoot, "manifest.xml"));
        string Value(string name) =>
            xml.Root?.Elements().FirstOrDefault(e => e.Name.LocalName == name)?.Value.Trim()
            ?? throw new InvalidOperationException($"manifest.xml has no <{name}>.");
        return new AddinManifest(Value("Id"), Value("Version"));
    }
}

/// <summary>
/// Makes Word load the add-in for a scratch document: the same webextension and taskpanes parts
/// that office-addin-dev-settings' sideload template carries, pointing at the add-in where
/// <see cref="Sideload"/> made it available. Without them the add-in's ribbon group never appears;
/// with them the add-in loads but its pane stays shut, so the harness opens it from the ribbon
/// (M0, 2026-10-15, research D5).
/// </summary>
public static class TaskpaneDocument
{
    public const string WebExtensionPart = "/word/webextensions/webextension.xml";
    public const string TaskpanesPart = "/word/webextensions/taskpanes.xml";
    public const string WebExtensionRelationship = "http://schemas.microsoft.com/office/2011/relationships/webextension";
    public const string TaskpanesRelationship = "http://schemas.microsoft.com/office/2011/relationships/webextensiontaskpanes";

    private static readonly XNamespace We = "http://schemas.microsoft.com/office/webextensions/webextension/2010/11";
    private static readonly XNamespace Wetp = "http://schemas.microsoft.com/office/webextensions/taskpanes/2010/11";
    private static readonly XNamespace R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

    /// <summary>Adds the parts to <paramref name="docxPath"/> (a scratch copy, never a fixture).</summary>
    public static void AddAutoOpenTaskpane(string docxPath, AddinManifest manifest, AddinStore store)
    {
        using var package = Package.Open(docxPath, FileMode.Open, FileAccess.ReadWrite);
        var extensionUri = new Uri(WebExtensionPart, UriKind.Relative);
        var taskpanesUri = new Uri(TaskpanesPart, UriKind.Relative);
        if (package.PartExists(taskpanesUri)) throw new InvalidOperationException($"{docxPath} already has a task pane part.");

        var extension = package.CreatePart(extensionUri, "application/vnd.ms-office.webextension+xml");
        Write(extension, new XElement(We + "webextension",
            new XAttribute(XNamespace.Xmlns + "we", We),
            new XAttribute("id", "{" + manifest.Id + "}"),
            new XElement(We + "reference",
                new XAttribute("id", manifest.Id),
                new XAttribute("version", manifest.Version),
                new XAttribute("store", store.Store),
                new XAttribute("storeType", store.StoreType)),
            new XElement(We + "alternateReferences"),
            new XElement(We + "properties"),
            new XElement(We + "bindings")));

        var taskpanes = package.CreatePart(taskpanesUri, "application/vnd.ms-office.webextensiontaskpanes+xml");
        var link = taskpanes.CreateRelationship(new Uri("webextension.xml", UriKind.Relative), TargetMode.Internal, WebExtensionRelationship);
        Write(taskpanes, new XElement(Wetp + "taskpanes",
            new XAttribute(XNamespace.Xmlns + "wetp", Wetp),
            new XAttribute(XNamespace.Xmlns + "r", R),
            new XElement(Wetp + "taskpane",
                new XAttribute("dockstate", ""),
                new XAttribute("visibility", "1"),
                new XAttribute("width", "350"),
                new XAttribute("row", "1"),
                new XElement(Wetp + "webextensionref", new XAttribute(R + "id", link.Id)))));

        package.CreateRelationship(new Uri(TaskpanesPart.TrimStart('/'), UriKind.Relative), TargetMode.Internal, TaskpanesRelationship);
    }

    /// <summary>
    /// Removes every task pane and web extension part from <paramref name="docxPath"/>, as Word
    /// saved them (it renames webextension.xml to webextension1.xml), so the copy opens without the
    /// add-in: the catalogue keeps offering it, unlike the developer registration the harness undoes.
    /// </summary>
    public static void RemoveTaskpanes(string docxPath)
    {
        using var package = Package.Open(docxPath, FileMode.Open, FileAccess.ReadWrite);
        foreach (var link in package.GetRelationshipsByType(TaskpanesRelationship).ToList()) package.DeleteRelationship(link.Id);
        var parts = package.GetParts().Select(p => p.Uri)
            .Where(u => u.OriginalString.StartsWith("/word/webextensions/", StringComparison.OrdinalIgnoreCase)).ToList();
        // Deleting a part deletes its relationships part too.
        foreach (var uri in parts.Where(package.PartExists)) package.DeletePart(uri);
    }

    private static void Write(PackagePart part, XElement root)
    {
        using var stream = part.GetStream(FileMode.Create, FileAccess.Write);
        new XDocument(new XDeclaration("1.0", "utf-8", "yes"), root).Save(stream);
    }
}
