import "@testing-library/jest-dom/vitest";

// jsdom has no layout, so scrollIntoView is missing; the palette calls it to keep the selected row in view.
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
