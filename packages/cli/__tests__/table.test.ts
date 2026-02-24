import { describe, expect, it } from "bun:test";
import type { Column } from "../src/display/table.js";
import { renderDetails, renderTable } from "../src/display/table.js";
import { stripAnsi } from "../src/display/terminal.js";

describe("table", () => {
  describe("renderTable", () => {
    const columns: Column[] = [
      { key: "id", header: "ID", minWidth: 4, align: "right" },
      { key: "name", header: "Name" },
      { key: "status", header: "Status" },
    ];

    it("renders empty state message", () => {
      const result = renderTable(columns, []);
      expect(stripAnsi(result)).toContain("No results.");
    });

    it("renders custom empty message", () => {
      const result = renderTable(columns, [], {
        emptyMessage: "Nothing here",
      });
      expect(stripAnsi(result)).toContain("Nothing here");
    });

    it("renders rows with headers", () => {
      const rows = [
        { id: 1, name: "Alice", status: "active" },
        { id: 2, name: "Bob", status: "inactive" },
      ];
      const result = renderTable(columns, rows);
      const plain = stripAnsi(result);

      expect(plain).toContain("ID");
      expect(plain).toContain("Name");
      expect(plain).toContain("Status");
      expect(plain).toContain("Alice");
      expect(plain).toContain("Bob");
    });

    it("respects maxRows", () => {
      const rows = [
        { id: 1, name: "A", status: "x" },
        { id: 2, name: "B", status: "x" },
        { id: 3, name: "C", status: "x" },
      ];
      const result = renderTable(columns, rows, { maxRows: 2 });
      const plain = stripAnsi(result);

      expect(plain).toContain("A");
      expect(plain).toContain("B");
      expect(plain).not.toContain("C");
      expect(plain).toContain("... and 1 more");
    });

    it("uses custom format function", () => {
      const cols: Column[] = [
        {
          key: "price",
          header: "Price",
          format: (v) => `$${v}`,
        },
      ];
      const rows = [{ price: 42 }];
      const result = renderTable(cols, rows);
      const plain = stripAnsi(result);
      expect(plain).toContain("$42");
    });

    it("handles null/undefined values", () => {
      const rows = [{ id: 1, name: null, status: undefined }];
      const result = renderTable(columns, rows);
      // Should not throw
      expect(result).toBeDefined();
    });
  });

  describe("renderDetails", () => {
    it("renders key-value pairs", () => {
      const entries = [
        { label: "Name", value: "Test" },
        { label: "Status", value: "Active" },
      ];
      const result = renderDetails(entries);
      const plain = stripAnsi(result);

      expect(plain).toContain("Name:");
      expect(plain).toContain("Test");
      expect(plain).toContain("Status:");
      expect(plain).toContain("Active");
    });

    it("respects custom indent", () => {
      const entries = [{ label: "Key", value: "Val" }];
      const result = renderDetails(entries, { indent: 4 });
      const lines = stripAnsi(result).split("\n");
      expect(lines[0].startsWith("    ")).toBe(true);
    });
  });
});
