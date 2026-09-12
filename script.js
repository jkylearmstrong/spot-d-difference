const leftInput = document.getElementById("leftImage");
const rightInput = document.getElementById("rightImage");
const thresholdInput = document.getElementById("threshold");
const thresholdValue = document.getElementById("thresholdValue");
const statusText = document.getElementById("status");

const leftCanvas = document.getElementById("leftCanvas");
const rightCanvas = document.getElementById("rightCanvas");
const diffCanvas = document.getElementById("diffCanvas");

const leftContext = leftCanvas.getContext("2d");
const rightContext = rightCanvas.getContext("2d");
const diffContext = diffCanvas.getContext("2d");
const UNCHANGED_PIXEL_ALPHA = 110;
const MAX_COMPARISON_DIMENSION = 800; // cap largest canvas dimension to avoid huge work

const loadedImages = {
  left: null,
  right: null,
};

function copyCanvasSize(sourceCanvas, targetCanvas) {
  targetCanvas.width = sourceCanvas.width;
  targetCanvas.height = sourceCanvas.height;
}

function setCanvasSize(canvas, width, height) {
  canvas.width = width;
  canvas.height = height;
}

function clearCanvas(context, canvas) {
  context.clearRect(0, 0, canvas.width, canvas.height);
}

function drawImageToCanvas(image, context, canvas) {
  clearCanvas(context, canvas);
  const imageAspectRatio = image.width / image.height;
  const canvasAspectRatio = canvas.width / canvas.height;

  let sourceWidth = image.width;
  let sourceHeight = image.height;
  let sourceX = 0;
  let sourceY = 0;

  if (imageAspectRatio > canvasAspectRatio) {
    sourceWidth = image.height * canvasAspectRatio;
    sourceX = (image.width - sourceWidth) / 2;
  } else if (imageAspectRatio < canvasAspectRatio) {
    sourceHeight = image.width / canvasAspectRatio;
    sourceY = (image.height - sourceHeight) / 2;
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Unable to load image."));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

function updateStatus(message) {
  statusText.textContent = message;
}

function compareImages() {
  if (!loadedImages.left || !loadedImages.right) {
    return;
  }

  // Use the smaller of the two images' dimensions to avoid upscaling, and cap the max dimension
  const targetWidth = Math.max(1, Math.min(loadedImages.left.width, loadedImages.right.width));
  const targetHeight = Math.max(1, Math.min(loadedImages.left.height, loadedImages.right.height));

  // Respect aspect ratio by capping the larger dimension to MAX_COMPARISON_DIMENSION
  const widthScale = MAX_COMPARISON_DIMENSION / targetWidth;
  const heightScale = MAX_COMPARISON_DIMENSION / targetHeight;
  const scale = Math.min(1, Math.min(widthScale, heightScale));

  const comparisonWidth = Math.max(1, Math.floor(targetWidth * scale));
  const comparisonHeight = Math.max(1, Math.floor(targetHeight * scale));

  setCanvasSize(leftCanvas, comparisonWidth, comparisonHeight);
  setCanvasSize(rightCanvas, comparisonWidth, comparisonHeight);
  drawImageToCanvas(loadedImages.left, leftContext, leftCanvas);
  drawImageToCanvas(loadedImages.right, rightContext, rightCanvas);

  copyCanvasSize(leftCanvas, diffCanvas);
  const leftPixels = leftContext.getImageData(0, 0, leftCanvas.width, leftCanvas.height);
  const rightPixels = rightContext.getImageData(0, 0, rightCanvas.width, rightCanvas.height);
  const diffPixels = new ImageData(leftPixels.width, leftPixels.height);

  const threshold = Number(thresholdInput.value);
  let changedPixels = 0;

  for (let index = 0; index < leftPixels.data.length; index += 4) {
    const redDifference = Math.abs(leftPixels.data[index] - rightPixels.data[index]);
    const greenDifference = Math.abs(leftPixels.data[index + 1] - rightPixels.data[index + 1]);
    const blueDifference = Math.abs(leftPixels.data[index + 2] - rightPixels.data[index + 2]);
    const averageDifference = (redDifference + greenDifference + blueDifference) / 3;

    if (averageDifference > threshold) {
      diffPixels.data[index] = 255;
      diffPixels.data[index + 1] = 90;
      diffPixels.data[index + 2] = 90;
      diffPixels.data[index + 3] = 255;
      changedPixels += 1;
    } else {
      diffPixels.data[index] = rightPixels.data[index];
      diffPixels.data[index + 1] = rightPixels.data[index + 1];
      diffPixels.data[index + 2] = rightPixels.data[index + 2];
      diffPixels.data[index + 3] = UNCHANGED_PIXEL_ALPHA;
    }
  }

  diffContext.putImageData(diffPixels, 0, 0);
  const total = leftPixels.width * leftPixels.height || 1;
  const percent = ((changedPixels / total) * 100).toFixed(2);
  updateStatus(`Detected ${changedPixels.toLocaleString()} changed pixels (${percent}%) at threshold ${threshold}. Comparison size ${comparisonWidth}×${comparisonHeight}.`);
}

async function handleFileChange(side, event) {
  const [file] = event.target.files;

  if (!file) {
    loadedImages[side] = null;
    if (side === "left") {
      clearCanvas(leftContext, leftCanvas);
    } else {
      clearCanvas(rightContext, rightCanvas);
    }
    clearCanvas(diffContext, diffCanvas);
    updateStatus("Upload two similar images to compare them.");
    return;
  }

  try {
    updateStatus(`Loading ${file.name}...`);
    loadedImages[side] = await loadImage(file);
    compareImages();
    if (!loadedImages.left || !loadedImages.right) {
      updateStatus("Upload the other image to start comparing.");
    }
  } catch (error) {
    loadedImages[side] = null;
    updateStatus(error.message);
  }
}

leftInput.addEventListener("change", (event) => {
  handleFileChange("left", event);
});

rightInput.addEventListener("change", (event) => {
  handleFileChange("right", event);
});

thresholdInput.addEventListener("input", () => {
  thresholdValue.textContent = thresholdInput.value;
  compareImages();
});
