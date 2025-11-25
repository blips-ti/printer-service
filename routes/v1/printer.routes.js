const express = require("express");
const { printQueue, processQueue } = require("../../utils/print.utils");
const escpos = require("escpos");
escpos.USB = require("escpos-usb");

const printerRouter = express.Router();

printerRouter.post("/print", async (req, res) => {

  try {
    const printJobs = req.body.printJobs;
    const jobPromises = printJobs.map((job) => {
      return new Promise((resolve, reject) => {
        printQueue.push({
          ...job,
          _onComplete: resolve,
          _onError: reject,
        });
        processQueue();
      });
    });

    const results = await Promise.allSettled(jobPromises);

    const failedJobs = results
      .map((result, index) =>
        result.status === "rejected" ? { index, reason: result.reason } : null
      )
      .filter(Boolean);

    if (failedJobs.length > 0) {
      console.error("Some jobs failed:", failedJobs);
      return res.status(207).json({
        success: false,
        message: `${failedJobs.length} job(s) failed.`,
        failedJobs,
      });
    }

    res.json({
      success: true,
      message: "All print jobs processed successfully",
    });
  } catch (e) {
    console.error("Unexpected error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// === this api is used to find all the USB printers connected and to get their IDs ===
printerRouter.get("/findUsbPrintersAndPrint", async (req, res) => {
  try {
    // Find all USB printers
    const usbDevices = escpos.USB.findPrinter();

    if (!usbDevices.length) {
      return res.json({ success: false, message: "No USB printers found" });
    }

    let printerList = [];

    usbDevices.forEach((device) => {
      // Extract necessary details
      const vendorId = device.deviceDescriptor.idVendor;
      const productId = device.deviceDescriptor.idProduct;

      // Store printer details
      printerList.push({ type: "USB", vendorId, productId });

      // Create and print
      const printerDevice = new escpos.USB(vendorId, productId);
      const printer = new escpos.Printer(printerDevice);

      printerDevice.open(() => {
        printer
          .align("ct")
          .text(`USB Printer Found`)
          .text(`Vendor ID: ${vendorId}`)
          .text(`Product ID: ${productId}`)
          .text(`\n\nKitchen: __________`)
          .cut()
          .close();
      });
    });

    return res.json({ success: true, printers: printerList });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});


// === this api returns all the USB printes connected ===
printerRouter.get("/findUsbPrinters", (req, res) => {
  try {
    const devices = escpos.USB.findPrinter();
    res.send({
      devices,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      success: false,
      message: e.message,
    });
  }
});

module.exports = printerRouter;