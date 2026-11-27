import * as monaco from "monaco-editor";

const editorElement = document.getElementById("monaco-editor");

export const editor = monaco.editor.create(editorElement, {
    value: `defmodule Hello do
  def greet(name) do
    "Hello, #{name}"
  end
end`,
    language: "elixir",
    theme: "vs-dark",
    automaticLayout: true
});