
import { supabase, OWNER_UID } from "./supabase.js";

const form = document.querySelector("#loginForm");
const message = document.querySelector("#message");

function showMessage(text, isError = true) {
  message.textContent = text;
  message.className = isError ? "message error" : "message success";
}

async function isOwner() {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user || user.id !== OWNER_UID) return false;
  return true;
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = form.querySelector("button");
    button.disabled = true;
    showMessage("جارٍ التحقق من الحساب...", false);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: document.querySelector("#email").value.trim(),
        password: document.querySelector("#password").value
      });

      if (error) throw error;

      if (!(await isOwner())) {
        await supabase.auth.signOut();
        throw new Error("هذا الحساب غير مصرح له بدخول لوحة المالك.");
      }

      window.location.replace("admin.html");
    } catch (error) {
      showMessage(error.message || "تعذر تسجيل الدخول.");
    } finally {
      button.disabled = false;
    }
  });
}
