async function main() {
  const status = document.getElementById("status");
  try {
    if (globalThis.Aurobore?.Device?.getInfo) {
      const info = await Aurobore.Device.getInfo({});
      status.textContent = `Device: ${info.model} (${info.platform})`;
    } else {
      status.textContent = "Aurobore bridge ready";
    }
    document.dispatchEvent(new CustomEvent("aurobore:ready"));
  } catch (err) {
    status.textContent = `Error: ${err.message ?? err}`;
  }
}

main();
