# spot-d-difference

A minimal browser app for comparing two similar images and highlighting the changed areas.

## Usage

1. Open `index.html` in a browser.
2. Upload a left image and a right image.
3. Adjust the threshold slider if needed.
4. Review the generated diff mask and difference count.

## Notes

- Images are scaled to a shared comparison size before diffing.
- Higher threshold values ignore smaller pixel changes.
- No build step or dependencies are required.
