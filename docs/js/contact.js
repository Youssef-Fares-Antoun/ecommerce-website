document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".contact-form form") || document.querySelector("form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nameInput = form.querySelector('input[type="text"]');
    const emailInput = form.querySelector('input[type="email"]');
    const messageInput = form.querySelector('textarea');
    const submitBtn = form.querySelector('button[type="submit"]');

    const name = nameInput ? nameInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";
    const message = messageInput ? messageInput.value.trim() : "";

    const origText = submitBtn ? submitBtn.textContent : "Send Message";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert(data.message || "✅ Thank you! Your message has been sent.");
        form.reset();
      } else {
        alert(data.message || "Failed to send message. Please try again.");
      }
    } catch (err) {
      console.error("Contact Form Error:", err);
      alert("Network error sending message.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = origText;
      }
    }
  });
});