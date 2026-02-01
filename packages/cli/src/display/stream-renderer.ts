import { c, type StreamChunk } from "@locusai/sdk/node";

/**
 * Renders streaming chunks to the terminal in real-time.
 */
export class StreamRenderer {
  private currentLine = "";
  private isThinking = false;
  // Buffer to handle completion marker that may span multiple chunks
  private textBuffer = "";
  private readonly COMPLETION_MARKER = "<promise>COMPLETE</promise>";

  /**
   * Render a stream chunk to the terminal.
   */
  renderChunk(chunk: StreamChunk): void {
    switch (chunk.type) {
      case "text_delta":
        this.renderTextDelta(chunk.content);
        break;

      case "tool_use":
        this.renderToolUse(chunk.tool);
        break;

      case "thinking":
        this.renderThinking(chunk.content);
        break;

      case "result":
        // Final result - usually already shown via text_delta
        break;

      case "error":
        this.renderError(chunk.error);
        break;
    }
  }

  private renderTextDelta(content: string): void {
    // Clear thinking indicator if active
    if (this.isThinking) {
      this.clearThinking();
    }

    // Add content to buffer
    this.textBuffer += content;

    // Remove any complete markers from the buffer
    this.textBuffer = this.textBuffer.replace(
      /<promise>COMPLETE<\/promise>/g,
      ""
    );

    // Calculate safe output length (keep potential partial marker in buffer)
    const markerLength = this.COMPLETION_MARKER.length;
    let safeLength = this.textBuffer.length;
    for (let i = 1; i < markerLength && i < this.textBuffer.length; i++) {
      const suffix = this.textBuffer.slice(-i);
      if (this.COMPLETION_MARKER.startsWith(suffix)) {
        safeLength = this.textBuffer.length - i;
        break;
      }
    }

    // Output the safe portion
    const safeContent = this.textBuffer.slice(0, safeLength);
    this.textBuffer = this.textBuffer.slice(safeLength);

    if (!safeContent) return;

    process.stdout.write(safeContent);
    this.currentLine += safeContent;

    if (safeContent.includes("\n")) {
      this.currentLine = safeContent.split("\n").pop() || "";
    }
  }

  private renderToolUse(tool: string): void {
    // Clear thinking indicator if active
    if (this.isThinking) {
      this.clearThinking();
    }

    // Ensure we start on a new line
    if (this.currentLine.length > 0) {
      process.stdout.write("\n");
      this.currentLine = "";
    }

    process.stdout.write(c.gray(`[Using ${tool}...]\n`));
  }

  private renderThinking(content?: string): void {
    if (!this.isThinking) {
      this.isThinking = true;
      const thinkingMsg = content ? `[Thinking: ${content}]` : "[Thinking...]";
      process.stdout.write(c.dim(thinkingMsg));
    }
  }

  private clearThinking(): void {
    if (this.isThinking) {
      // Clear the thinking indicator by overwriting with spaces
      process.stdout.write(`\r${" ".repeat(50)}\r`);
      this.isThinking = false;
    }
  }

  private renderError(error: string): void {
    if (this.isThinking) {
      this.clearThinking();
    }

    if (this.currentLine.length > 0) {
      process.stdout.write("\n");
      this.currentLine = "";
    }

    process.stdout.write(`\n${c.error("Error:")} ${c.red(error)}\n`);
  }

  /**
   * Call when streaming is complete to ensure proper line ending.
   */
  finalize(): void {
    if (this.isThinking) {
      this.clearThinking();
    }

    // Flush any remaining buffered text (filtering out completion marker)
    if (this.textBuffer) {
      const remaining = this.textBuffer.replace(
        /<promise>COMPLETE<\/promise>/g,
        ""
      );
      if (remaining) {
        process.stdout.write(remaining);
        this.currentLine += remaining;
      }
      this.textBuffer = "";
    }

    if (this.currentLine.length > 0) {
      process.stdout.write("\n");
      this.currentLine = "";
    }
  }
}
