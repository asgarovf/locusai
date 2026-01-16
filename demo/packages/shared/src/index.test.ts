import { expect, test } from "bun:test";
import { APP_NAME } from "../src/index";

test("APP_NAME is correct", () => {
  expect(APP_NAME).toBe("Demo App");
});
