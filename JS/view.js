
import { supabase } from "./supabase.js";

const title = document.querySelector("#fileTitle");
const description = document.querySelector("#fileDescription");
const content = document.querySelector("#fileContent");
const message = document.querySelector("#message");
const copyButton = document.querySelector("#copyButton");
const downloadButton = document.querySelector("#downloadButton");

let currentText = "";
let currentFilename = "file.txt";
let fileLoaded = false;

copyButton.disabled = true;
downloadButton.disabled = true;

function showMessage(text, error = false) {
  message.textContent = text;
  message.className = error
    ? "message error"
    : "message success";
}

function safeFilename(name) {
  return (name || "file")
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim() || "file";
}

async function loadFile() {
  const id = new URLSearchParams(location.search).get("id");

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw new Error("رابط الملف غير صحيح.");
  }

  const { data: file, error } = await supabase
    .from("txt_files")
    .select("id,title,description,storage_path,is_public")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error("تعذر جلب بيانات الملف.");
  }

  // سيمنع Supabase الوصول إلى بيانات الملفات الخاصة
  // إذا لم يكن المستخدم المصرح له مسجل الدخول.
  if (!file) {
    throw new Error("الملف غير موجود أو ليس لديك صلاحية لفتحه.");
  }

  const { data, error: downloadError } = await supabase.storage
    .from("txt-files")
    .download(file.storage_path);

  if (downloadError || !data) {
    throw new Error("تعذر فتح الملف أو لا تملك صلاحية الوصول إليه.");
  }

  currentText = await data.text();
  currentFilename = safeFilename(file.title) + ".txt";

  title.textContent = file.title;
  description.textContent = file.description || "";
  content.textContent = currentText;

  document.title = `${file.title} | TXT Vault`;

  fileLoaded = true;
  copyButton.disabled = false;
  downloadButton.disabled = false;

  showMessage("تم تحميل الملف بنجاح.");
}

copyButton.addEventListener("click", async () => {
  if (!fileLoaded) return;

  try {
    await navigator.clipboard.writeText(currentText);
    showMessage("تم نسخ النص بنجاح.");
  } catch {
    showMessage(
      "تعذر النسخ التلقائي. يمكنك تحديد النص ونسخه يدويًا.",
      true
    );
  }
});

downloadButton.addEventListener("click", () => {
  if (!fileLoaded) return;

  const blob = new Blob(["\uFEFF", currentText], {
    type: "text/plain;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = currentFilename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);

  showMessage("بدأ تنزيل الملف.");
});

loadFile().catch(error => {
  fileLoaded = false;

  title.textContent = "تعذر فتح الملف";
  description.textContent = "";
  content.textContent = "";

  copyButton.disabled = true;
  downloadButton.disabled = true;

  showMessage(
    error.message || "حدث خطأ غير متوقع.",
    true
  );
});
