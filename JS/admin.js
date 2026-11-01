
import { supabase, OWNER_UID } from "./supabase.js";

const $ = (selector) => document.querySelector(selector);

const form = $("#uploadForm");
const fileInput = $("#file");
const uploadButton = $("#uploadButton");
const uploadMessage = $("#uploadMessage");
const uploadProgress = $("#uploadProgress");
const batchPreview = $("#batchPreview");

const adminFiles = $("#adminFiles");
const adminMessage = $("#adminMessage");
const refreshButton = $("#refreshButton");

const fileCount = $("#fileCount");
const publicFileCount = $("#publicFileCount");
const privateFileCount = $("#privateFileCount");

const privacyFileCount = $("#privacyFileCount");
const publicStart = $("#publicStart");
const publicEnd = $("#publicEnd");
const applyPrivacyButton = $("#applyPrivacyButton");
const allPublicButton = $("#allPublicButton");
const allPrivateButton = $("#allPrivateButton");
const privacyMessage = $("#privacyMessage");

const deleteNumbers = $("#deleteNumbers");
const deleteSelectedButton = $("#deleteSelectedButton");
const deleteAllButton = $("#deleteAllButton");
const deleteMessage = $("#deleteMessage");

const MAX_FILE_SIZE = 2 * 1024 * 1024;

let owner = false;
let uploading = false;
let filesCache = [];
let privacyBusy = false;
let deleting = false;

function notify(node, message, error = false) {
  node.textContent = message;
  node.className = error
    ? "message error"
    : "message success";
}

function make(tag, className = "", text = "") {
  const element = document.createElement(tag);

  if (className) element.className = className;
  element.textContent = text;

  return element;
}

function getFileNumber(file) {
  const match = file.name.match(/^(\d+)\.txt$/i);

  if (!match) return null;

  const number = Number(match[1]);

  if (!Number.isSafeInteger(number) || number < 1) {
    return null;
  }

  return number;
}

function getNumberFromTitle(title) {
  const match = String(title || "").match(/^Chapter (\d+) S$/);

  if (!match) return null;

  const number = Number(match[1]);

  return Number.isSafeInteger(number) && number >= 1
    ? number
    : null;
}

function getTitle(number) {
  return `Chapter ${number} S`;
}

function sortByNumber(a, b) {
  const numberA = getNumberFromTitle(a.title);
  const numberB = getNumberFromTitle(b.title);

  if (numberA === null && numberB === null) {
    return String(a.title).localeCompare(String(b.title));
  }

  if (numberA === null) return 1;
  if (numberB === null) return -1;

  return numberA - numberB;
}

async function checkOwner() {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user || user.id !== OWNER_UID) {
    await supabase.auth.signOut();
    location.replace("login.html");
    return false;
  }

  owner = true;
  return true;
}

$("#logoutButton").addEventListener("click", async () => {
  await supabase.auth.signOut();
  location.replace("login.html");
});

function prepareFiles(files) {
  const prepared = [];
  const seenNumbers = new Set();

  for (const file of files) {
    const number = getFileNumber(file);

    if (number === null) {
      throw new Error(
        `اسم الملف "${file.name}" غير صالح. استخدم مثلًا 1.txt أو 25.txt.`
      );
    }

    if (seenNumbers.has(number)) {
      throw new Error(
        `الرقم ${number} مكرر في الملفات المختارة. اختر ملفًا واحدًا لكل رقم.`
      );
    }

    seenNumbers.add(number);

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `الملف "${file.name}" أكبر من 2 ميجابايت.`
      );
    }

    prepared.push({ file, number });
  }

  return prepared.sort((a, b) => a.number - b.number);
}

function renderPreview() {
  batchPreview.replaceChildren();

  const files = Array.from(fileInput.files || []);

  if (!files.length) {
    batchPreview.textContent =
      "اختر ملفات TXT لمعاينة الفصول قبل الرفع.";
    return;
  }

  try {
    const prepared = prepareFiles(files);

    batchPreview.append(
      make("p", "", `عدد الملفات المختارة: ${prepared.length}`)
    );

    const list = make("div", "batch-preview-list");

    for (const item of prepared) {
      const title = getTitle(item.number);
      const card = make("div", "file-card");

      card.append(
        make("h3", "", title),
        make("p", "muted", `الوصف: ${title}`),
        make("p", "muted", "الخصوصية عند الرفع: خاص")
      );

      list.append(card);
    }

    batchPreview.append(list);
  } catch (error) {
    batchPreview.textContent = error.message;
  }
}

fileInput.addEventListener("change", renderPreview);

async function getAllFiles() {
  const { data, error } = await supabase
    .from("txt_files")
    .select("*");

  if (error) throw error;

  return (data || []).sort(sortByNumber);
}

function updateCounts(files) {
  const total = files.length;
  const publicCount = files.filter(file => file.is_public).length;
  const privateCount = total - publicCount;

  if (fileCount) fileCount.textContent = total;
  if (publicFileCount) publicFileCount.textContent = publicCount;
  if (privateFileCount) privateFileCount.textContent = privateCount;
  if (privacyFileCount) privacyFileCount.textContent = total;

  const hasFiles = total > 0;

  if (publicStart) publicStart.disabled = !hasFiles || privacyBusy;
  if (publicEnd) publicEnd.disabled = !hasFiles || privacyBusy;

  if (applyPrivacyButton) {
    applyPrivacyButton.disabled = !hasFiles || privacyBusy;
  }

  if (allPublicButton) {
    allPublicButton.disabled = !hasFiles || privacyBusy;
  }

  if (allPrivateButton) {
    allPrivateButton.disabled = !hasFiles || privacyBusy;
  }

  if (deleteSelectedButton) {
    deleteSelectedButton.disabled = !hasFiles || deleting;
  }

  if (deleteAllButton) {
    deleteAllButton.disabled = !hasFiles || deleting;
  }
}

function syncRangeInputs(files) {
  const numbers = files
    .map(file => getNumberFromTitle(file.title))
    .filter(number => number !== null)
    .sort((a, b) => a - b);

  if (!numbers.length) {
    publicStart.value = "";
    publicEnd.value = "";
    return;
  }

  // لا نفرض نطاقًا عامًا تلقائيًا؛ هذه القيم مجرد اقتراح.
  if (!publicStart.value) {
    publicStart.value = String(numbers[0]);
  }

  if (!publicEnd.value) {
    publicEnd.value = String(numbers[numbers.length - 1]);
  }
}

function renderFiles(files) {
  adminFiles.replaceChildren();

  if (!files.length) {
    adminFiles.append(
      make("p", "muted", "لا توجد ملفات حتى الآن.")
    );
    return;
  }

  for (const file of files) {
    const number = getNumberFromTitle(file.title);
    const card = make("article", "file-card");
    const actions = make("div", "file-actions");

    card.append(
      make("h3", "", file.title),
      make("p", "muted", file.description || "لا يوجد وصف."),
      make(
        "p",
        "muted",
        file.is_public ? "عام" : "خاص — المالك فقط"
      )
    );

    if (number !== null) {
      card.append(
        make("p", "muted", `رقم الفصل: ${number}`)
      );
    }

    const view = make("a", "btn btn-outline", "عرض");
    view.href = `view.html?id=${encodeURIComponent(file.id)}`;

    const visibility = make(
      "button",
      "btn btn-outline",
      file.is_public ? "جعله خاصًا" : "جعله عامًا"
    );

    visibility.type = "button";
    visibility.disabled = privacyBusy || deleting;

    visibility.addEventListener("click", async () => {
      visibility.disabled = true;

      try {
        const { error } = await supabase
          .from("txt_files")
          .update({
            is_public: !file.is_public,
            updated_at: new Date().toISOString()
          })
          .eq("id", file.id);

        if (error) throw error;

        await loadFiles();
        notify(adminMessage, "تم تحديث خصوصية الملف.");
      } catch (error) {
        notify(
          adminMessage,
          `تعذر تحديث الخصوصية: ${error.message}`,
          true
        );
      } finally {
        visibility.disabled = false;
      }
    });

    const remove = make("button", "btn btn-danger", "حذف");
    remove.type = "button";
    remove.disabled = deleting || privacyBusy;

    remove.addEventListener("click", async () => {
      if (!confirm(`هل تريد حذف "${file.title}" نهائيًا؟`)) {
        return;
      }

      await deleteFiles([file]);
    });

    actions.append(view, visibility, remove);
    card.append(actions);
    adminFiles.append(card);
  }
}

async function loadFiles() {
  if (!owner) return;

  try {
    const files = await getAllFiles();
    filesCache = files;

    updateCounts(files);
    syncRangeInputs(files);
    renderFiles(files);
  } catch (error) {
    notify(
      adminMessage,
      `تعذر تحميل الملفات: ${error.message}`,
      true
    );
    throw error;
  }
}

async function uploadOne(item) {
  const title = getTitle(item.number);
  const path = `${crypto.randomUUID()}.txt`;

  const { error: uploadError } = await supabase.storage
    .from("txt-files")
    .upload(path, item.file, {
      contentType: "text/plain",
      upsert: false
    });

  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase
    .from("txt_files")
    .insert({
      title,
      description: title,
      storage_path: path,
      is_public: false,
      owner_id: OWNER_UID
    });

  if (insertError) {
    const { error: cleanupError } = await supabase.storage
      .from("txt-files")
      .remove([path]);

    if (cleanupError) {
      throw new Error(
        `فشل تسجيل "${title}" في قاعدة البيانات، كما فشل تنظيف ملف التخزين. ` +
        `خطأ التسجيل: ${insertError.message}. ` +
        `خطأ التنظيف: ${cleanupError.message}`
      );
    }

    throw insertError;
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  if (!owner || uploading) return;

  let prepared;

  try {
    prepared = prepareFiles(Array.from(fileInput.files || []));

    if (!prepared.length) {
      throw new Error("اختر ملف TXT واحدًا على الأقل.");
    }
  } catch (error) {
    notify(uploadMessage, error.message, true);
    return;
  }

  uploading = true;
  uploadButton.disabled = true;
  fileInput.disabled = true;
  refreshButton.disabled = true;

  const failures = [];
  let succeeded = 0;

  try {
    const existingFiles = await getAllFiles();
    const existingTitles = new Set(
      existingFiles.map(file => file.title)
    );

    const duplicate = prepared.find(item =>
      existingTitles.has(getTitle(item.number))
    );

    if (duplicate) {
      throw new Error(
        `${getTitle(duplicate.number)} موجود بالفعل. لم يبدأ الرفع.`
      );
    }

    for (let index = 0; index < prepared.length; index++) {
      const item = prepared[index];
      const title = getTitle(item.number);

      notify(
        uploadProgress,
        `جارٍ رفع ${index + 1} من ${prepared.length}: ${title}`
      );

      try {
        await uploadOne(item);
        succeeded++;
      } catch (error) {
        failures.push({
          title,
          message: error.message || "خطأ غير معروف"
        });
      }
    }

    await loadFiles();

    if (failures.length === 0) {
      notify(
        uploadMessage,
        `تم رفع ${succeeded} ملف بنجاح. الملفات الجديدة خاصة افتراضيًا.`
      );

      uploadProgress.textContent = "";
      form.reset();
      renderPreview();
    } else {
      notify(
        uploadMessage,
        `نجح رفع ${succeeded} من ${prepared.length} ملف. عدد الملفات التي فشل رفعها: ${failures.length}.`,
        true
      );

      uploadProgress.textContent = failures
        .map(item => `${item.title}: ${item.message}`)
        .join("\n");
    }
  } catch (error) {
    notify(
      uploadMessage,
      `تعذر إكمال الرفع: ${error.message}`,
      true
    );
  } finally {
    uploading = false;
    uploadButton.disabled = false;
    fileInput.disabled = false;
    refreshButton.disabled = false;
  }
});

// تحديث خصوصية كل الملفات الموجودة حسب النطاق المحدد.
// كل ملف خارج النطاق يتحول إلى خاص.
async function setPrivacyByRange(start, end) {
  if (!owner || privacyBusy) return;

  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 1 ||
    end < start
  ) {
    notify(privacyMessage, "أدخل نطاق أرقام صحيحًا.", true);
    return;
  }

  await changePrivacy(file =>
    getNumberFromTitle(file.title) !== null &&
    getNumberFromTitle(file.title) >= start &&
    getNumberFromTitle(file.title) <= end
  );
}

async function changePrivacy(isPublicForFile) {
  if (!owner || privacyBusy) return;

  privacyBusy = true;
  updateCounts(filesCache);

  let changed = 0;
  const failures = [];

  try {
    // نجلب البيانات من قاعدة البيانات قبل التعديل.
    const files = await getAllFiles();

    for (const file of files) {
      const number = getNumberFromTitle(file.title);

      // نتعامل مع أسماء الفصول القياسية فقط.
      if (number === null) {
        failures.push(`${file.title}: اسم الفصل غير قياسي`);
        continue;
      }

      const desired = Boolean(isPublicForFile(file));

      if (file.is_public === desired) continue;

      const { error } = await supabase
        .from("txt_files")
        .update({
          is_public: desired,
          updated_at: new Date().toISOString()
        })
        .eq("id", file.id);

      if (error) {
        failures.push(`${file.title}: ${error.message}`);
      } else {
        changed++;
      }
    }

    await loadFiles();

    if (failures.length) {
      notify(
        privacyMessage,
        `تم تعديل ${changed} ملف، لكن تعذر تعديل ${failures.length} ملف:\n${failures.join("\n")}`,
        true
      );
    } else {
      notify(
        privacyMessage,
        `تم تحديث الخصوصية بنجاح. عدد الملفات التي تغيرت صلاحيتها: ${changed}.`
      );
    }
  } catch (error) {
    notify(
      privacyMessage,
      `تعذر تحديث الخصوصية: ${error.message}`,
      true
    );
  } finally {
    privacyBusy = false;
    updateCounts(filesCache);
  }
}

applyPrivacyButton.addEventListener("click", async () => {
  const start = Number(publicStart.value);
  const end = Number(publicEnd.value);

  if (
    publicStart.value.trim() === "" ||
    publicEnd.value.trim() === ""
  ) {
    notify(privacyMessage, "اكتب بداية النطاق ونهايته.", true);
    return;
  }

  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 1 ||
    end < start
  ) {
    notify(privacyMessage, "النطاق غير صالح. راجع الأرقام.", true);
    return;
  }

  if (
    !confirm(
      `هل تريد جعل الفصول الموجودة من ${start} إلى ${end} عامة، ` +
      "وجعل كل الفصول الموجودة خارج النطاق خاصة؟"
    )
  ) {
    return;
  }

  await setPrivacyByRange(start, end);
});

allPublicButton.addEventListener("click", async () => {
  if (!filesCache.length) return;

  if (!confirm("هل تريد جعل جميع الملفات الموجودة عامة؟")) {
    return;
  }

  await changePrivacy(() => true);
});

allPrivateButton.addEventListener("click", async () => {
  if (!filesCache.length) return;

  if (!confirm("هل تريد جعل جميع الملفات الموجودة خاصة؟")) {
    return;
  }

  await changePrivacy(() => false);
});

// يقبل مثل: 1,2,5,10-20
function parseDeleteNumbers(value) {
  const parts = value.split(",").map(part => part.trim());

  if (!parts.length || parts.some(part => !part)) {
    throw new Error("اكتب الأرقام مفصولة بفواصل صحيحة.");
  }

  const numbers = new Set();

  for (const part of parts) {
    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);

    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);

      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start < 1 ||
        end < start
      ) {
        throw new Error(`النطاق "${part}" غير صالح.`);
      }

      // حماية من نطاقات الحذف الضخمة التي قد تسبب تعليق الصفحة.
      if (end - start > 10000) {
        throw new Error(`النطاق "${part}" كبير جدًا.`);
      }

      for (let number = start; number <= end; number++) {
        numbers.add(number);
      }

      continue;
    }

    if (!/^\d+$/.test(part)) {
      throw new Error(`القيمة "${part}" غير صحيحة.`);
    }

    const number = Number(part);

    if (!Number.isSafeInteger(number) || number < 1) {
      throw new Error(`رقم الفصل "${part}" غير صالح.`);
    }

    numbers.add(number);
  }

  return numbers;
}

// يحذف الملف من التخزين أولًا ثم يحذف بياناته.
// عند فشل خطوة لا نخفي الخطأ عن المالك.
async function deleteFiles(files) {
  if (!owner || deleting || !files.length) return;

  deleting = true;
  updateCounts(filesCache);

  let succeeded = 0;
  const failures = [];

  try {
    for (let index = 0; index < files.length; index++) {
      const file = files[index];

      notify(
        deleteMessage,
        `جارٍ حذف ${index + 1} من ${files.length}: ${file.title}`
      );

      const { error: storageError } = await supabase.storage
        .from("txt-files")
        .remove([file.storage_path]);

      if (storageError) {
        failures.push(
          `${file.title}: تعذر حذف ملف التخزين: ${storageError.message}`
        );
        continue;
      }

      const { error: rowError } = await supabase
        .from("txt_files")
        .delete()
        .eq("id", file.id);

      if (rowError) {
        failures.push(
          `${file.title}: حُذف الملف من التخزين لكن تعذر حذف بياناته: ${rowError.message}`
        );
        continue;
      }

      succeeded++;
    }

    await loadFiles();

    if (failures.length) {
      notify(
        deleteMessage,
        `تم حذف ${succeeded} ملف، وتعذر حذف ${failures.length} ملف:\n${failures.join("\n")}`,
        true
      );
    } else {
      notify(
        deleteMessage,
        `تم حذف ${succeeded} ملف بنجاح.`
      );

      deleteNumbers.value = "";
    }
  } catch (error) {
    notify(
      deleteMessage,
      `حدث خطأ أثناء الحذف: ${error.message}`,
      true
    );
  } finally {
    deleting = false;
    updateCounts(filesCache);
  }
}

deleteSelectedButton.addEventListener("click", async () => {
  if (!owner || deleting) return;

  let numbers;

  try {
    numbers = parseDeleteNumbers(deleteNumbers.value.trim());
  } catch (error) {
    notify(deleteMessage, error.message, true);
    return;
  }

  const selected = filesCache.filter(file => {
    const number = getNumberFromTitle(file.title);
    return number !== null && numbers.has(number);
  });

  if (!selected.length) {
    notify(
      deleteMessage,
      "لا توجد ملفات موجودة تطابق الأرقام التي أدخلتها.",
      true
    );
    return;
  }

  if (
    !confirm(
      `سيتم حذف ${selected.length} ملف موجود. هل تريد المتابعة؟`
    )
  ) {
    return;
  }

  await deleteFiles(selected);
});

deleteAllButton.addEventListener("click", async () => {
  if (!owner || deleting || !filesCache.length) return;

  const count = filesCache.length;

  if (
    !confirm(
      `تحذير: سيتم حذف جميع الملفات الموجودة وعددها ${count} نهائيًا. هل أنت متأكد؟`
    )
  ) {
    return;
  }

  // نسخة من القائمة لتجنب تغييرها أثناء الحذف.
  await deleteFiles([...filesCache]);
});

refreshButton.addEventListener("click", async () => {
  refreshButton.disabled = true;

  try {
    await loadFiles();
    notify(adminMessage, "تم تحديث قائمة الملفات.");
  } catch {
    // رسالة الخطأ تظهر داخل loadFiles.
  } finally {
    refreshButton.disabled = false;
  }
});

if (await checkOwner()) {
  try {
    await loadFiles();
  } catch {
    // رسالة الخطأ تظهر داخل loadFiles.
  }
}
