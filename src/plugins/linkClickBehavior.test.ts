import { describe, expect, it } from "vitest";
import {
  isIntentionalOpenClick,
  opensViaModifier,
  type PointerDownAnchor,
  shouldOpenOnClick,
} from "./linkClickBehavior";

// Minimal stand-in for the MouseEvent fields the predicates read.
type ClickLike = Pick<
  MouseEvent,
  "metaKey" | "ctrlKey" | "button" | "detail" | "clientX" | "clientY"
>;

function click(overrides: Partial<ClickLike> = {}): MouseEvent {
  return {
    metaKey: false,
    ctrlKey: false,
    button: 0,
    detail: 1,
    clientX: 0,
    clientY: 0,
    ...overrides,
  } as MouseEvent;
}

describe("shouldOpenOnClick", () => {
  it("opens on cmd/ctrl+click in edit mode, edits on a plain click", () => {
    expect(shouldOpenOnClick(click(), "edit")).toBe(false);
    expect(shouldOpenOnClick(click({ metaKey: true }), "edit")).toBe(true);
    expect(shouldOpenOnClick(click({ ctrlKey: true }), "edit")).toBe(true);
  });

  it("opens on a plain click in open mode, edits on cmd/ctrl+click", () => {
    expect(shouldOpenOnClick(click(), "open")).toBe(true);
    expect(shouldOpenOnClick(click({ metaKey: true }), "open")).toBe(false);
    expect(shouldOpenOnClick(click({ ctrlKey: true }), "open")).toBe(false);
  });
});

describe("opensViaModifier", () => {
  it("is true only for edit mode", () => {
    expect(opensViaModifier("edit")).toBe(true);
    expect(opensViaModifier("open")).toBe(false);
  });
});

describe("isIntentionalOpenClick", () => {
  const anchor: PointerDownAnchor = { x: 10, y: 10, onLink: true };

  it("accepts a genuine click that started on the link and did not move", () => {
    expect(
      isIntentionalOpenClick(click({ clientX: 11, clientY: 12 }), anchor),
    ).toBe(true);
  });

  it("rejects a non-primary button", () => {
    expect(isIntentionalOpenClick(click({ button: 1 }), anchor)).toBe(false);
  });

  it("rejects a double/triple click", () => {
    expect(isIntentionalOpenClick(click({ detail: 2 }), anchor)).toBe(false);
  });

  it("rejects when the pointer did not go down on a link", () => {
    expect(isIntentionalOpenClick(click(), null)).toBe(false);
    expect(
      isIntentionalOpenClick(click(), { x: 10, y: 10, onLink: false }),
    ).toBe(false);
  });

  it("rejects a drag past the movement threshold", () => {
    expect(
      isIntentionalOpenClick(click({ clientX: 30, clientY: 10 }), anchor),
    ).toBe(false);
  });
});
