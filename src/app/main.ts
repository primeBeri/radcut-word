import { mount } from "svelte";
import { startOfficeHost } from "../adapters/office/bootstrap";
import Root from "../ui/Root.svelte";

await startOfficeHost();

const target = document.getElementById("app");
if (!target) throw new Error("Task pane markup is missing #app.");
mount(Root, { target });
