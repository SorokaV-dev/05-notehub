import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Modal from "./Modal";

describe("Modal", () => {
  it("renders outside the React root and closes on backdrop click", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal onClose={onClose}>
        <p>Modal content</p>
      </Modal>,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.getByRole("dialog")).toContainElement(
      screen.getByText("Modal content"),
    );
    fireEvent.click(screen.getByText("Modal content"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<Modal onClose={onClose}>Content</Modal>);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
