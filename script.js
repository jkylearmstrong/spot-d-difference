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

const loadedImages = {
  left: null,
  right: null,
};

function copyCanvasSize(sourceCanvas, targetCanvas) {
  targetCanvas.width = sourceCanvas.width;
  targetCanvas.height = sourceCanvas.height;
}

function clearCanvas(context, canvas) {
  context.clearRect(0, 0, canvas.width, canvas.height);
}

function drawImageToCanvas(image, context, canvas) {
  clearCanvas(context, canvas);

  const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const x = (canvas.width - drawWidth) / 2;
  const y = (canvas.height - drawHeight) / 2;

  context.drawImage(image, x, y, drawWidth, drawHeight);
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

  drawImageToCanvas(loadedImages.left, leftContext, leftCanvas);
  drawImageToCanvas(loadedImages.right, rightContext, rightCanvas);

  copyCanvasSize(leftCanvas, diffCanvas);
  const leftPixels = leftContext.getImageData(0, 0, leftCanvas.width, leftCanvas.height);
  const rightPixels = rightContext.getImageData(0, 0, rightCanvas.width, rightCanvas.height);
  const diffPixels = diffContext.createImageData(leftPixels.width, leftPixels.height);

  const threshold = Number(thresholdInput.value);
  let changedPixels = 0;

  for (let index = 0; index < leftPixels.data.length; index += 4) {
    const redDifference = Math.abs(leftPixels.data[index] - rightPixels.data[index]);
    const greenDifference = Math.abs(leftPixels.data[index + 1] - rightPixels.data[index + 1]);
    const blueDifference = Math.abs(leftPixels.data[index + 2] - rightPixels.data[index + 2]);
    const alphaDifference = Math.abs(leftPixels.data[index + 3] - rightPixels.data[index + 3]);
    const totalDifference = redDifference + greenDifference + blueDifference + alphaDifference;

    if (totalDifference > threshold * 4) {
      diffPixels.data[index] = 255;
      diffPixels.data[index + 1] = 90;
      diffPixels.data[index + 2] = 90;
      diffPixels.data[index + 3] = 255;
      changedPixels += 1;
    } else {
      diffPixels.data[index] = rightPixels.data[index];
      diffPixels.data[index + 1] = rightPixels.data[index + 1];
      diffPixels.data[index + 2] = rightPixels.data[index + 2];
      diffPixels.data[index + 3] = 110;
    }
  }

  diffContext.putImageData(diffPixels, 0, 0);
  updateStatus(`Detected ${changedPixels.toLocaleString()} changed pixels at threshold ${threshold}.`);
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
