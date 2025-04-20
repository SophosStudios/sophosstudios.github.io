function setFavicon(iconUrl) {
    let favicon = document.querySelector("link[rel~='icon']");
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }
    favicon.href = iconUrl;
  }
  
  // Example: Set the favicon dynamically
  document.addEventListener("DOMContentLoaded", () => {
    setFavicon("../../content/favicon.png"); // Replace with your desired favicon path
  });