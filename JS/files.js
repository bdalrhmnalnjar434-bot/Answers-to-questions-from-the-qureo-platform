
import { supabase } from "./supabase.js";

const list = document.querySelector("#fileList");
const search = document.querySelector("#searchInput");
const count = document.querySelector("#fileCount");
const message = document.querySelector("#message");

let files = [];

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function render() {
  const query = search.value.trim().toLocaleLowerCase();

  const filtered = files.filter(file =>
    file.title.toLocaleLowerCase().includes(query) ||
    (file.description || "").toLocaleLowerCase().includes(query)
  );

  count.textContent = `${filtered.length} ملف`;
  list.replaceChildren();

  if (!filtered.length) {
    list.append(element("p", "muted", "لا توجد ملفات مطابقة."));
    return;
  }

  for (const file of filtered) {
    const card = element("article", "file-card");
    const heading = element("h3", "", file.title);
    const desc = element("p", "muted",
      file.description || "ملف نصي متاح للقراءة.");

    const actions = element("div", "file-actions");
    const open = element("a", "btn btn-primary", "فتح الملف");
    open.href = `view.html?id=${encodeURIComponent(file.id)}`;

    actions.append(open);
    card.append(heading, desc, actions);
    list.append(card);
  }
}

async function loadFiles() {
  const { data, error } = await supabase
    .from("txt_files")
    .select("id,title,description,created_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("تعذر تحميل الملفات. راجع إعدادات Supabase وسياسات RLS.");
  }

  files = data || [];
  render();
}

search.addEventListener("input", render);

loadFiles().catch(error => {
  list.replaceChildren(element("p", "error", error.message));
});
