const copyButton = document.getElementById('copy-code');
const textToCopy = document.getElementById('copy-code');

copyButton.addEventListener('click', () => {
  navigator.clipboard.writeText(textToCopy.textContent)
    .then(() => {
      window.alert('You have successfully copied the code from: ' + window.location);
    })
    .catch(err => {
      console.error('Failed to copy text: ', err);
    });
});