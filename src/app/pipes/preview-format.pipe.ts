import { Pipe, type PipeTransform } from "@angular/core"

@Pipe({
  name: "previewFormat",
  standalone: true,
})
export class PreviewFormatPipe implements PipeTransform {
  transform(value: string, maxLength = 100): string {
    if (!value) return ""

    const lines = value.split("\n").slice(0, 7) // Get up to 5 lines
    let result = lines.join("\n").trim()

    if (result.length > maxLength) {
      result = result.slice(0, maxLength) + "..."
    } else if (lines.length === 5 && value.split("\n").length > 5) {
      result += "\n..."
    }

    return result
  }
}

