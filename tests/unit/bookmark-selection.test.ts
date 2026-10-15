import { describe, expect, it } from "vitest";
import { chooseUsableBookmark, isWordManaged, WORD_MANAGED_BOOKMARKS } from "../../src/core/bookmarks/selection";

const text = (name: string) => ({ name, spansHeadingText: true });

describe("Word-managed bookmarks", () => {
  it.each(["_Toc242545907", "_TOC1", "_toc", "_Hlk181818181", "_hlk", "_GoBack", "_goback", "_GOBACK"])(
    "%s is Word-managed",
    (name) => expect(isWordManaged(name)).toBe(true),
  );

  it.each(["_Ref242545576", "_RCabc", "Toc1", "_GoBackup", "Alpha", "x_Toc"])("%s is not Word-managed", (name) =>
    expect(isWordManaged(name)).toBe(false),
  );

  it("keeps the list in one exported constant", () => {
    expect(WORD_MANAGED_BOOKMARKS).toEqual([
      { match: "prefix", value: "_toc" },
      { match: "prefix", value: "_hlk" },
      { match: "exact", value: "_goback" },
    ]);
  });
});

describe("usable-bookmark selection", () => {
  it("usable = spansHeadingText && !wordManaged", () => {
    expect(chooseUsableBookmark([{ name: "WholeParagraph", spansHeadingText: false }])).toBeNull();
    expect(chooseUsableBookmark([text("_Toc1")])).toBeNull();
    expect(chooseUsableBookmark([text("Mine")])).toBe("Mine");
  });

  it("treats Word's own cross-reference bookmarks (_Ref…) as usable", () => {
    expect(chooseUsableBookmark([text("_Toc242545898"), text("_Ref242545576")])).toBe("_Ref242545576");
  });

  it("picks the first usable bookmark by case-insensitive name order, every time", () => {
    expect(chooseUsableBookmark([text("zeta"), text("Alpha")])).toBe("Alpha");
    expect(chooseUsableBookmark([text("Alpha"), text("zeta")])).toBe("Alpha");
    expect(chooseUsableBookmark([text("beta"), text("ALPHA"), text("_Hlk1")])).toBe("ALPHA");
  });

  it("returns null when none is usable, so the caller creates one", () => {
    expect(chooseUsableBookmark([])).toBeNull();
    expect(
      chooseUsableBookmark([text("_GoBack"), text("_Hlk1"), { name: "PartOfText", spansHeadingText: false }]),
    ).toBeNull();
  });
});
