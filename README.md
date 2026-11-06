# Valheim Sign Generator

## Introduction

Valheim Sign Generator is a small browser app for composing sign text before putting it in Valheim. It previews rich text, tracks the game's 50-byte text limit, and produces text ready to copy into a sign.

Type or paste Unicode characters directly. The editor also provides confirmed text formatting, color and highlight controls, and animations from Valheim's sprite sets. The preview is approximate; in-game rendering remains the final check.

Open `index.html` in a modern browser to use the app. It has no build step and loads no remote services.

## In-game examples

<table>
  <tr>
    <td align="center"><img src="assets/sign-plain-text.png" alt="Valheim sign with plain text" width="420"><br>Plain text</td>
    <td align="center"><img src="assets/sign-italic-text.png" alt="Valheim sign with italic text" width="420"><br>Italic text</td>
  </tr>
  <tr>
    <td colspan="2" align="center"><img src="assets/sign-animation.gif" alt="Animated emoji on a Valheim sign" width="400"><br>Animated emoji</td>
  </tr>
</table>

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Defines the editor interface and its controls. |
| `style.css` | Styles the layout and responsive design. |
| `app.js` | Connects the controls, preview, and copy actions. |
| `core.js` | Builds and validates Valheim sign text. |
| `README.md` | Describes the project and how to use it. |
| `assets/` | Contains the in-game screenshots and animation GIF. |
