/**
 * BookShare - Main Application Logic
 * PDF Viewer, Local Directory Scanner, and N-Up Layout PDF Exporter
 */

(function () {
  'use strict';

  // State Management
  const state = {
    documents: [],           // List of PDF documents loaded { id, name, size, data, pdfDoc, totalPages }
    documentsMeta: [],       // Metadata list for available books from manifest/cache
    currentDocId: null,      // Currently active document ID
    currentDocFileName: null,// Currently active document file name
    currentPageNum: 1,       // Active page number in main viewer
    zoomScale: 1.0,          // Current zoom scale (number or 'page-fit' / 'page-width' / 'auto')
    rotation: 0,             // Current rotation angle (0, 90, 180, 270)
    sidebarCollapsed: false,
    activeSidebarTab: 'tab-docs',

    // Viewer Layout State
    layoutMode: 'continuous', // 'continuous' (default) or 'single'
    isScrollingToPage: false,
    pageObserver: null,
    activePageObserver: null,

    // Export Modal State
    export: {
      nupCols: 2,
      nupRows: 1,
      paperSize: '8x11',     // '8x11', '8x13', 'a4'
      orientation: 'landscape',// 'portrait', 'landscape'
      margin: 'normal',      // 'none', 'tight', 'normal', 'wide'
      drawBorders: false,
      drawPageNumbers: false,
      pageRange: '',
      currentPreviewSheet: 1,
      totalPreviewSheets: 1,
      renderedPagesCache: {} // Cache canvas images for live preview & export
    }
  };

  // DOM Elements Reference Cache
  const DOM = {};

  // Initialize App on DOM Ready
  document.addEventListener('DOMContentLoaded', () => {
    cacheDOMElements();
    initIcons();
    bindEvents();

    // Automatically load all PDF documents from documents directory
    autoLoadFolderDocuments();
  });

  function cacheDOMElements() {
    DOM.app = document.getElementById('app');
    DOM.btnExportModal = document.getElementById('btn-export-modal');

    DOM.sidebar = document.getElementById('sidebar');
    DOM.sidebarOverlay = document.getElementById('sidebar-overlay');
    DOM.btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    DOM.btnMobileSidebarToggle = document.getElementById('btn-mobile-sidebar-toggle');
    DOM.docList = document.getElementById('doc-list');
    DOM.thumbsList = document.getElementById('thumbs-list');
    DOM.docCount = document.getElementById('doc-count');
    DOM.docSearchInput = document.getElementById('doc-search-input');

    DOM.pageNumInput = document.getElementById('page-num-input');
    DOM.pageCountDisplay = document.getElementById('page-count-display');
    DOM.btnPrevPage = document.getElementById('btn-prev-page');
    DOM.btnNextPage = document.getElementById('btn-next-page');

    DOM.zoomSelect = document.getElementById('zoom-select');
    DOM.btnZoomIn = document.getElementById('btn-zoom-in');
    DOM.btnZoomOut = document.getElementById('btn-zoom-out');
    DOM.btnRotateLeft = document.getElementById('btn-rotate-left');
    DOM.btnRotateRight = document.getElementById('btn-rotate-right');
    DOM.btnToggleLayout = document.getElementById('btn-toggle-layout');
    DOM.layoutModeLabel = document.getElementById('layout-mode-label');
    DOM.btnFullscreen = document.getElementById('btn-fullscreen');
    DOM.docTitleBadge = document.getElementById('doc-title-badge');

    DOM.viewerStage = document.getElementById('viewer-stage');
    DOM.pdfCanvas = document.getElementById('pdf-canvas');
    DOM.pdfViewWrapper = document.getElementById('pdf-view-wrapper');
    DOM.viewerLoader = document.getElementById('viewer-loader');
    DOM.dropZone = document.getElementById('drop-zone');

    // Export Modal Elements
    DOM.exportModal = document.getElementById('export-modal');
    DOM.btnCloseExportModal = document.getElementById('btn-close-export-modal');
    DOM.btnCancelExport = document.getElementById('btn-cancel-export');
    DOM.btnRunExport = document.getElementById('btn-run-export');
    DOM.customCols = document.getElementById('custom-cols');
    DOM.customRows = document.getElementById('custom-rows');
    DOM.gridTotalCount = document.getElementById('grid-total-count');
    DOM.marginSelect = document.getElementById('margin-select');
    DOM.borderCheckbox = document.getElementById('border-checkbox');
    DOM.pageNumberCheckbox = document.getElementById('page-number-checkbox');
    DOM.exportPageRange = document.getElementById('export-page-range');

    DOM.previewCanvas = document.getElementById('preview-canvas');
    DOM.previewSheetStage = document.getElementById('preview-sheet-stage');
    DOM.btnPrevSheet = document.getElementById('btn-prev-sheet');
    DOM.btnNextSheet = document.getElementById('btn-next-sheet');
    DOM.currentSheetNum = document.getElementById('current-sheet-num');
    DOM.totalSheetsNum = document.getElementById('total-sheets-num');
    DOM.sumSourcePages = document.getElementById('sum-source-pages');
    DOM.sumPaperSpec = document.getElementById('sum-paper-spec');
    DOM.sumOutputSheets = document.getElementById('sum-output-sheets');

    DOM.exportStatusText = document.getElementById('export-status-text');
    DOM.exportProgressBar = document.getElementById('export-progress-bar');
    DOM.exportProgressFill = document.getElementById('export-progress-fill');
  }

  function initIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // Event Listeners Binding
  function bindEvents() {
    // Sidebar Toggles & Tabs
    DOM.btnToggleSidebar.addEventListener('click', () => toggleSidebar());
    if (DOM.btnMobileSidebarToggle) {
      DOM.btnMobileSidebarToggle.addEventListener('click', () => toggleSidebar());
    }
    if (DOM.sidebarOverlay) {
      DOM.sidebarOverlay.addEventListener('click', () => toggleSidebar(true));
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabTarget = e.currentTarget.getAttribute('data-tab');
        switchTab(tabTarget);
      });
    });

    DOM.docSearchInput.addEventListener('input', filterDocList);

    // Viewer Page Navigation
    DOM.btnPrevPage.addEventListener('click', () => changePage(-1));
    DOM.btnNextPage.addEventListener('click', () => changePage(1));
    DOM.pageNumInput.addEventListener('change', (e) => {
      const pageVal = parseInt(e.target.value, 10);
      if (!isNaN(pageVal)) jumpToPage(pageVal);
    });

    // Zoom Controls
    DOM.zoomSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'page-fit' || val === 'page-width' || val === 'auto') {
        state.zoomScale = val;
      } else {
        state.zoomScale = parseFloat(val);
      }
      renderCurrentPage();
    });

    DOM.btnZoomIn.addEventListener('click', () => modifyZoom(0.2));
    DOM.btnZoomOut.addEventListener('click', () => modifyZoom(-0.2));

    // Rotation Controls
    DOM.btnRotateLeft.addEventListener('click', () => rotateViewer(-90));
    DOM.btnRotateRight.addEventListener('click', () => rotateViewer(90));

    // Layout View Mode Toggle (Continuous vs Single Page)
    if (DOM.btnToggleLayout) {
      DOM.btnToggleLayout.addEventListener('click', toggleLayoutMode);
    }

    // Fullscreen
    DOM.btnFullscreen.addEventListener('click', toggleFullscreen);

    // Drag and Drop
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      DOM.dropZone.classList.remove('hidden');
    });

    DOM.dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      DOM.dropZone.classList.add('hidden');
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      DOM.dropZone.classList.add('hidden');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileList(Array.from(e.dataTransfer.files));
      }
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', handleKeyboardShortcuts);

    // Export Modal Events
    DOM.btnExportModal.addEventListener('click', openExportModal);
    DOM.btnCloseExportModal.addEventListener('click', closeExportModal);
    DOM.btnCancelExport.addEventListener('click', closeExportModal);

    // Custom Grid Input Listeners
    const handleGridInputChange = () => {
      const cols = Math.max(1, Math.min(10, parseInt(DOM.customCols.value, 10) || 1));
      const rows = Math.max(1, Math.min(10, parseInt(DOM.customRows.value, 10) || 1));
      state.export.nupCols = cols;
      state.export.nupRows = rows;
      if (DOM.gridTotalCount) {
        DOM.gridTotalCount.textContent = (cols * rows).toString();
      }
      updateExportPreview();
    };

    if (DOM.customCols) {
      DOM.customCols.addEventListener('input', handleGridInputChange);
      DOM.customCols.addEventListener('change', handleGridInputChange);
    }
    if (DOM.customRows) {
      DOM.customRows.addEventListener('input', handleGridInputChange);
      DOM.customRows.addEventListener('change', handleGridInputChange);
    }

    // Paper Size Radio Group
    document.querySelectorAll('input[name="paper-size"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        state.export.paperSize = e.target.value;
        updateExportPreview();
      });
    });

    // Orientation Controls
    document.querySelectorAll('.segment-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
        const targetBtn = e.currentTarget;
        targetBtn.classList.add('active');
        state.export.orientation = targetBtn.getAttribute('data-orientation');
        updateExportPreview();
      });
    });

    // Formatting Options Change
    DOM.marginSelect.addEventListener('change', (e) => {
      state.export.margin = e.target.value;
      updateExportPreview();
    });

    DOM.borderCheckbox.addEventListener('change', (e) => {
      state.export.drawBorders = e.target.checked;
      updateExportPreview();
    });

    DOM.pageNumberCheckbox.addEventListener('change', (e) => {
      state.export.drawPageNumbers = e.target.checked;
      updateExportPreview();
    });

    DOM.exportPageRange.addEventListener('input', (e) => {
      state.export.pageRange = e.target.value;
      updateExportPreview();
    });

    // Export Preview Sheet Navigation
    DOM.btnPrevSheet.addEventListener('click', () => {
      if (state.export.currentPreviewSheet > 1) {
        state.export.currentPreviewSheet--;
        renderExportSheetPreview();
      }
    });

    DOM.btnNextSheet.addEventListener('click', () => {
      if (state.export.currentPreviewSheet < state.export.totalPreviewSheets) {
        state.export.currentPreviewSheet++;
        renderExportSheetPreview();
      }
    });

    // Run Export Download
    DOM.btnRunExport.addEventListener('click', runPDFExport);
  }

  // Sidebar Logic
  function toggleSidebar(forceState) {
    if (typeof forceState === 'boolean') {
      state.sidebarCollapsed = forceState;
    } else {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    }
    DOM.sidebar.classList.toggle('collapsed', state.sidebarCollapsed);
    if (DOM.sidebarOverlay) {
      DOM.sidebarOverlay.classList.toggle('active', !state.sidebarCollapsed);
    }
    // Re-adjust zoom if auto-fit
    setTimeout(() => {
      if (typeof state.zoomScale !== 'number') {
        renderCurrentPage();
      }
    }, 320);
  }

  function switchTab(tabId) {
    state.activeSidebarTab = tabId;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');

    if (tabId === 'tab-thumbs' && state.currentDocId) {
      renderSidebarThumbnails();
    }
  }

  function filterDocList() {
    const q = DOM.docSearchInput.value.toLowerCase();
    document.querySelectorAll('.doc-item').forEach(item => {
      const name = item.querySelector('.doc-name').textContent.toLowerCase();
      item.style.display = name.includes(q) ? 'flex' : 'none';
    });
  }

  const DEFAULT_PDF_MANIFEST = [
    "Duka_LegEth_Chapter2.pdf",
    "Duka_LegEth_Chapter3.pdf",
    "Duka_LegEth_Chapter4.pdf"
  ];

  // IndexedDB Storage Manager for caching PDF ArrayBuffers locally
  const PDFCacheDB = {
    dbName: 'BookShareCache',
    storeName: 'pdf_blobs',
    dbPromise: null,

    init() {
      if (!this.dbPromise) {
        this.dbPromise = new Promise((resolve, reject) => {
          if (!window.indexedDB) {
            return reject(new Error('IndexedDB not supported'));
          }
          const req = indexedDB.open(this.dbName, 1);
          req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(this.storeName)) {
              db.createObjectStore(this.storeName);
            }
          };
          req.onsuccess = (e) => resolve(e.target.result);
          req.onerror = (e) => reject(e.target.error);
        });
      }
      return this.dbPromise;
    },

    async get(fileName) {
      try {
        const db = await this.init();
        return new Promise((resolve) => {
          const tx = db.transaction(this.storeName, 'readonly');
          const store = tx.objectStore(this.storeName);
          const req = store.get(fileName);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      } catch (e) {
        return null;
      }
    },

    async set(fileName, arrayBuffer) {
      try {
        const db = await this.init();
        return new Promise((resolve) => {
          const tx = db.transaction(this.storeName, 'readwrite');
          const store = tx.objectStore(this.storeName);
          store.put(arrayBuffer, fileName);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        });
      } catch (e) {
        return false;
      }
    },

    async has(fileName) {
      const val = await this.get(fileName);
      return val !== null && val !== undefined;
    }
  };

  let activeDownloadController = null;
  let activeLoadingTask = null;
  let backgroundFetchController = null;

  function stopAllBackgroundDownloads() {
    if (backgroundFetchController) {
      backgroundFetchController.abort();
      backgroundFetchController = null;
    }
  }

  function stopActivePDFLoadingTask() {
    if (activeLoadingTask) {
      try {
        activeLoadingTask.destroy();
      } catch (e) {}
      activeLoadingTask = null;
    }
  }

  // File Loading Logic
  async function autoLoadFolderDocuments() {
    let fileList = [];

    // Step 1: Fetch document manifest immediately
    try {
      const response = await fetch('documents/manifest.json');
      if (response.ok) {
        const fetchedList = await response.json();
        if (Array.isArray(fetchedList) && fetchedList.length > 0) {
          fileList = fetchedList;
        }
      }
    } catch (err) {
      console.warn("Could not fetch manifest.json, using default book list", err);
    }

    if (!fileList || fileList.length === 0) {
      fileList = DEFAULT_PDF_MANIFEST;
    }

    // Step 2: Immediately populate state.documentsMeta and update sidebar UI
    state.documentsMeta = [];
    for (const fileName of fileList) {
      const isCached = await PDFCacheDB.has(fileName);
      state.documentsMeta.push({
        id: 'doc_' + Math.random().toString(36).substring(2, 9),
        fileName: fileName,
        size: null,
        totalPages: null,
        pdfDoc: null,
        data: null,
        status: isCached ? 'cached' : 'idle'
      });
    }

    // Render book list on documents tab right away!
    updateDocListUI();

    // Step 3: Focus on loading the first book immediately
    if (state.documentsMeta.length > 0) {
      loadAndFocusBook(state.documentsMeta[0].fileName);
    }
  }

  async function loadAndFocusBook(fileName) {
    let meta = state.documentsMeta.find(m => m.fileName === fileName);
    if (!meta) return;

    // Instantly abort any active background fetches so 100% of network sockets free up
    stopAllBackgroundDownloads();

    // Instantly destroy previous PDF.js loading task and worker
    stopActivePDFLoadingTask();

    // Abort previous download controller if active
    if (activeDownloadController) {
      activeDownloadController.abort();
      activeDownloadController = null;
    }

    state.currentDocFileName = fileName;

    // If already fully parsed in memory
    if (meta.pdfDoc && meta.id) {
      selectDocument(meta.id);
      updateDocListActiveState();
      return;
    }

    const controller = new AbortController();
    activeDownloadController = controller;

    meta.status = 'loading';
    updateDocListUI();
    updateDocListActiveState();
    showLoader(true, `Loading ${fileName}...`);

    let loadingTask = null;
    try {
      let arrayBuffer = await PDFCacheDB.get(fileName);

      if (arrayBuffer) {
        meta.status = 'cached';
        loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      } else {
        const fileUrl = `documents/${encodeURI(fileName)}`;
        loadingTask = pdfjsLib.getDocument({
          url: fileUrl,
          rangeChunkSize: 65536,
          disableAutoFetch: true,
          disableStream: false
        });
      }

      activeLoadingTask = loadingTask;

      loadingTask.onProgress = (progress) => {
        if (controller.signal.aborted) return;
        if (progress.total > 0) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          const loadedMB = (progress.loaded / (1024 * 1024)).toFixed(1);
          const totalMB = (progress.total / (1024 * 1024)).toFixed(1);
          showLoader(true, `Loading ${fileName}: ${percent}% (${loadedMB} MB / ${totalMB} MB)...`);
        } else if (progress.loaded > 0) {
          const loadedMB = (progress.loaded / (1024 * 1024)).toFixed(1);
          showLoader(true, `Loading ${fileName}: ${loadedMB} MB...`);
        }
      };

      const pdfDoc = await loadingTask.promise;

      if (controller.signal.aborted) return;

      meta.pdfDoc = pdfDoc;
      meta.totalPages = pdfDoc.numPages;
      meta.status = 'ready';

      let docObj = state.documents.find(d => d.name === fileName);
      if (!docObj) {
        docObj = {
          id: meta.id,
          name: fileName,
          size: meta.size || 'Ready',
          data: arrayBuffer,
          pdfDoc: pdfDoc,
          totalPages: pdfDoc.numPages
        };
        state.documents.push(docObj);
      }

      updateDocListUI();

      if (state.currentDocFileName === fileName) {
        selectDocument(meta.id);
      }

      showLoader(false);

      // Save full ArrayBuffer asynchronously in background once stream completes
      if (!arrayBuffer) {
        pdfDoc.getData().then(async (data) => {
          meta.data = data.buffer;
          meta.size = formatFileSize(data.buffer.byteLength);
          docObj.size = meta.size;
          docObj.data = data.buffer;
          await PDFCacheDB.set(fileName, data.buffer);
          updateDocListUI();
        }).catch(e => console.warn("Background data stream capture note:", e));
      }

    } catch (err) {
      if (err.name === 'AbortError' || (err.message && err.message.includes('destroyed'))) {
        console.log(`Download/task aborted for ${fileName}`);
      } else {
        console.error(`Error loading ${fileName}:`, err);
        meta.status = 'error';
        updateDocListUI();
        showLoader(false);
      }
    } finally {
      if (activeDownloadController === controller) {
        activeDownloadController = null;
      }
      if (loadingTask && activeLoadingTask === loadingTask) {
        activeLoadingTask = null;
      }
    }
  }

  async function backgroundCacheRemainingBooks() {
    stopAllBackgroundDownloads();
    const controller = new AbortController();
    backgroundFetchController = controller;

    const scheduleIdle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
    scheduleIdle(async () => {
      for (const meta of state.documentsMeta) {
        if (controller.signal.aborted || activeDownloadController) break;
        if (!meta.pdfDoc) {
          const isCached = await PDFCacheDB.has(meta.fileName);
          if (!isCached) {
            try {
              let pdfResp = await fetch(`documents/${encodeURI(meta.fileName)}`, { signal: controller.signal });
              if (!pdfResp.ok) {
                pdfResp = await fetch(`./documents/${encodeURI(meta.fileName)}`, { signal: controller.signal });
              }
              if (pdfResp.ok && !controller.signal.aborted) {
                const buf = await pdfResp.arrayBuffer();
                if (!controller.signal.aborted) {
                  await PDFCacheDB.set(meta.fileName, buf);
                  meta.status = 'cached';
                  updateDocListUI();
                }
              }
            } catch (e) {
              if (e.name !== 'AbortError') {
                console.warn(`[Background Cache] Failed to cache ${meta.fileName}:`, e);
              }
            }
          }
        }
      }
    });
  }

  async function handleFileList(files) {
    const pdfFiles = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) return;

    showLoader(true, "Loading PDF document(s)...");

    for (const file of pdfFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        await PDFCacheDB.set(file.name, arrayBuffer);
        await addPdfDocument(file.name, file.size, arrayBuffer, true);
      } catch (err) {
        console.error("Error reading file: " + file.name, err);
      }
    }

    showLoader(false);
  }

  async function addPdfDocument(name, sizeBytes, arrayBuffer, autoSelect = true) {
    const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    try {
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdfDoc = await loadingTask.promise;

      const docObj = {
        id: docId,
        name: name,
        size: formatFileSize(sizeBytes),
        data: arrayBuffer,
        pdfDoc: pdfDoc,
        totalPages: pdfDoc.numPages
      };

      state.documents.push(docObj);

      let meta = state.documentsMeta.find(m => m.fileName === name);
      if (!meta) {
        meta = {
          id: docId,
          fileName: name,
          size: docObj.size,
          totalPages: docObj.totalPages,
          pdfDoc: pdfDoc,
          data: arrayBuffer,
          status: 'ready'
        };
        state.documentsMeta.push(meta);
      } else {
        meta.id = docId;
        meta.size = docObj.size;
        meta.totalPages = docObj.totalPages;
        meta.pdfDoc = pdfDoc;
        meta.data = arrayBuffer;
        meta.status = 'ready';
      }

      updateDocListUI();

      if (autoSelect) {
        selectDocument(docId);
      }
      return docObj;
    } catch (err) {
      console.error("PDF.js document parse error for " + name, err);
      return null;
    }
  }

  // Remember last page position per document (in memory & localStorage)
  function saveCurrentDocumentPage(pageNum) {
    if (!state.currentDocFileName) return;
    const docObj = state.documents.find(d => d.id === state.currentDocId);
    if (docObj) docObj.lastPageNum = pageNum;
    const meta = state.documentsMeta.find(m => m.fileName === state.currentDocFileName);
    if (meta) meta.lastPageNum = pageNum;

    try {
      localStorage.setItem('BookShare_LastPage_' + state.currentDocFileName, pageNum.toString());
    } catch (e) {
      console.warn('LocalStorage save notice:', e);
    }
  }

  function getSavedDocumentPage(fileName, totalPages) {
    let savedPage = 1;
    const meta = state.documentsMeta.find(m => m.fileName === fileName);
    if (meta && meta.lastPageNum) {
      savedPage = meta.lastPageNum;
    } else {
      const docObj = state.documents.find(d => d.name === fileName);
      if (docObj && docObj.lastPageNum) {
        savedPage = docObj.lastPageNum;
      } else {
        try {
          const val = localStorage.getItem('BookShare_LastPage_' + fileName);
          if (val) savedPage = parseInt(val, 10) || 1;
        } catch (e) {}
      }
    }
    if (totalPages && totalPages > 0) {
      savedPage = Math.min(Math.max(1, savedPage), totalPages);
    }
    return savedPage;
  }

  function selectDocument(docId) {
    const docObj = state.documents.find(d => d.id === docId);
    if (!docObj) return;

    state.currentDocId = docId;
    state.currentDocFileName = docObj.name;

    // Restore last remembered page position
    const rememberedPage = getSavedDocumentPage(docObj.name, docObj.totalPages);
    state.currentPageNum = rememberedPage;
    state.rotation = 0;

    DOM.pageCountDisplay.textContent = docObj.totalPages;
    DOM.pageNumInput.max = docObj.totalPages;
    DOM.pageNumInput.value = rememberedPage;
    DOM.docTitleBadge.textContent = docObj.name;

    updateDocListActiveState();
    renderCurrentPage();

    // Auto-collapse off-canvas sidebar on mobile screens for maximum reading space
    if (window.innerWidth <= 768) {
      toggleSidebar(true);
    }

    if (state.activeSidebarTab === 'tab-thumbs') {
      renderSidebarThumbnails();
    }
  }

  function removeDocumentByFileName(fileName) {
    state.documentsMeta = state.documentsMeta.filter(m => m.fileName !== fileName);
    state.documents = state.documents.filter(d => d.name !== fileName);
    updateDocListUI();

    if (state.currentDocFileName === fileName) {
      if (state.documentsMeta.length > 0) {
        loadAndFocusBook(state.documentsMeta[0].fileName);
      } else {
        state.currentDocId = null;
        state.currentDocFileName = null;
        DOM.docTitleBadge.textContent = "No File Open";
        DOM.pageCountDisplay.textContent = "0";
        DOM.pageNumInput.value = "1";
        clearCanvas();
      }
    }
  }

  function updateDocListUI() {
    const listToRender = state.documentsMeta.length > 0 ? state.documentsMeta : state.documents;
    DOM.docCount.textContent = listToRender.length;
    DOM.docList.innerHTML = '';

    if (listToRender.length === 0) {
      DOM.docList.innerHTML = `
        <div class="empty-state">
          <i data-lucide="folder-search"></i>
          <p>No PDFs loaded yet.</p>
        </div>
      `;
      initIcons();
      return;
    }

    listToRender.forEach(doc => {
      const fileName = doc.fileName || doc.name;
      const isSelected = (state.currentDocFileName === fileName) || (doc.id === state.currentDocId);

      let metaSubtext = '';
      if (doc.status === 'loading') {
        metaSubtext = '<span style="color: var(--primary); font-weight:600;">Downloading...</span>';
      } else if (doc.status === 'cached' && !doc.totalPages) {
        metaSubtext = '<span style="color: #10b981;">Cached (Ready)</span>';
      } else if (doc.totalPages) {
        metaSubtext = `<span>${doc.totalPages} pages</span> &bull; <span>${doc.size || ''}</span>`;
      } else if (doc.status === 'error') {
        metaSubtext = '<span style="color: #ef4444;">Error loading</span>';
      } else {
        metaSubtext = '<span style="color: var(--text-muted);">Available</span>';
      }

      const item = document.createElement('div');
      item.className = `doc-item ${isSelected ? 'active' : ''}`;
      item.setAttribute('data-filename', fileName);
      if (doc.id) item.setAttribute('data-id', doc.id);

      item.innerHTML = `
        <div class="doc-icon"><i data-lucide="file-text"></i></div>
        <div class="doc-details">
          <div class="doc-name" title="${fileName}">${fileName}</div>
          <div class="doc-meta">${metaSubtext}</div>
        </div>
        <button class="btn-remove-doc icon-btn" title="Remove File">
          <i data-lucide="x"></i>
        </button>
      `;

      item.addEventListener('click', () => loadAndFocusBook(fileName));
      item.querySelector('.btn-remove-doc').addEventListener('click', (e) => {
        e.stopPropagation();
        removeDocumentByFileName(fileName);
      });

      DOM.docList.appendChild(item);
    });

    initIcons();
  }

  function updateDocListActiveState() {
    document.querySelectorAll('.doc-item').forEach(item => {
      const fileName = item.getAttribute('data-filename');
      const id = item.getAttribute('data-id');
      const isActive = (state.currentDocFileName && fileName === state.currentDocFileName) || (state.currentDocId && id === state.currentDocId);
      item.classList.toggle('active', isActive);
    });
  }

  function toggleLayoutMode() {
    state.isScrollingToPage = true;
    state.layoutMode = state.layoutMode === 'continuous' ? 'single' : 'continuous';
    updateLayoutToggleUI();
    renderCurrentDocument();
  }

  function updateLayoutToggleUI() {
    if (!DOM.btnToggleLayout || !DOM.layoutModeLabel) return;
    const isContinuous = state.layoutMode === 'continuous';
    const iconName = isContinuous ? 'layers' : 'file';
    const labelText = isContinuous ? 'Continuous View' : 'Single Page View';
    const titleText = isContinuous
      ? 'Current: Continuous Scroll (Click to switch to Single Page View)'
      : 'Current: Single Page View (Click to switch to Continuous Scroll)';

    DOM.layoutModeLabel.textContent = labelText;
    DOM.btnToggleLayout.title = titleText;

    let iconEl = DOM.btnToggleLayout.querySelector('i, svg');
    if (iconEl) {
      const newI = document.createElement('i');
      newI.setAttribute('data-lucide', iconName);
      iconEl.replaceWith(newI);
    }

    if (isContinuous) {
      DOM.btnToggleLayout.classList.add('btn-primary');
      DOM.btnToggleLayout.classList.remove('btn-secondary');
    } else {
      DOM.btnToggleLayout.classList.remove('btn-primary');
      DOM.btnToggleLayout.classList.add('btn-secondary');
    }

    initIcons();
  }

  function calculateFitScale(unscaledViewport) {
    const isMobile = window.innerWidth <= 768;
    const stagePadding = isMobile ? 12 : 80;
    const stageWidth = Math.max(160, DOM.viewerStage.clientWidth - stagePadding);
    const stageHeight = Math.max(160, DOM.viewerStage.clientHeight - stagePadding);

    let effectiveZoom = state.zoomScale;
    if (isMobile && (effectiveZoom === 'auto' || typeof effectiveZoom !== 'number')) {
      effectiveZoom = 'page-width';
    }

    if (effectiveZoom === 'page-width' || effectiveZoom === 'auto') {
      return stageWidth / unscaledViewport.width;
    } else if (effectiveZoom === 'page-fit') {
      const scaleW = stageWidth / unscaledViewport.width;
      const scaleH = stageHeight / unscaledViewport.height;
      return Math.min(scaleW, scaleH);
    } else if (typeof effectiveZoom === 'number') {
      return effectiveZoom;
    }
    return stageWidth / unscaledViewport.width;
  }

  // Rendering PDF Pages in Main Viewer (Continuous by default)
  async function renderCurrentDocument() {
    const docObj = state.documents.find(d => d.id === state.currentDocId);
    if (!docObj) {
      clearCanvas();
      return;
    }

    // Clear observers
    if (state.pageObserver) {
      state.pageObserver.disconnect();
      state.pageObserver = null;
    }
    if (state.activePageObserver) {
      state.activePageObserver.disconnect();
      state.activePageObserver = null;
    }

    DOM.pdfViewWrapper.innerHTML = '';

    if (state.layoutMode === 'single') {
      DOM.pdfViewWrapper.className = 'pdf-view-wrapper single-layout';

      const pageDiv = document.createElement('div');
      pageDiv.className = 'pdf-page-container active-page';
      pageDiv.id = `pdf-page-${state.currentPageNum}`;

      const canvas = document.createElement('canvas');
      canvas.id = 'pdf-canvas';
      pageDiv.appendChild(canvas);

      DOM.pdfViewWrapper.appendChild(pageDiv);

      await renderSinglePageCanvas(docObj, state.currentPageNum, canvas);
      DOM.pageNumInput.value = state.currentPageNum;
      updateThumbnailSelection();
    } else {
      // Continuous Scroll View Mode (Default)
      DOM.pdfViewWrapper.className = 'pdf-view-wrapper continuous-layout';
      showLoader(true, "Loading continuous page layout...");

      try {
        // Get first page scale for viewport calculation
        const page1 = await docObj.pdfDoc.getPage(1);
        const unscaledViewport = page1.getViewport({ scale: 1.0, rotation: state.rotation });
        const scale = calculateFitScale(unscaledViewport);

        const outputScale = window.devicePixelRatio || 1;
        const placeholderW = Math.floor(unscaledViewport.width * scale);
        const placeholderH = Math.floor(unscaledViewport.height * scale);

        const pageContainers = [];

        for (let i = 1; i <= docObj.totalPages; i++) {
          const pageDiv = document.createElement('div');
          pageDiv.className = `pdf-page-container ${i === state.currentPageNum ? 'active-page' : ''}`;
          pageDiv.id = `pdf-page-${i}`;
          pageDiv.setAttribute('data-page-num', i);
          pageDiv.style.width = placeholderW + "px";
          pageDiv.style.height = placeholderH + "px";

          const canvas = document.createElement('canvas');
          canvas.className = 'pdf-page-canvas';
          pageDiv.appendChild(canvas);

          const pageTag = document.createElement('span');
          pageTag.className = 'page-number-tag';
          pageTag.textContent = `Page ${i}`;
          pageDiv.appendChild(pageTag);

          DOM.pdfViewWrapper.appendChild(pageDiv);
          pageContainers.push(pageDiv);
        }

        showLoader(false);

        state.isScrollingToPage = true;

        // Priority render target page & neighborhood if restored page is > 1
        if (state.currentPageNum > 1) {
          await forceRenderPageNeighborhood(docObj, state.currentPageNum);
          const restoredEl = document.getElementById(`pdf-page-${state.currentPageNum}`);
          if (restoredEl) {
            restoredEl.scrollIntoView({ behavior: 'auto', block: 'start' });
          }
        } else {
          // Immediately render the first 5 pages of the document
          const initialPagesToRender = Math.min(5, docObj.totalPages);
          for (let i = 1; i <= initialPagesToRender; i++) {
            const container = pageContainers[i - 1];
            const canvas = container ? container.querySelector('canvas') : null;
            if (canvas && !canvas.getAttribute('data-rendered')) {
              canvas.setAttribute('data-rendered', 'true');
              await renderPageCanvasToContainer(docObj, i, container, canvas, scale, outputScale);
            }
          }
        }

        setTimeout(() => {
          state.isScrollingToPage = false;
        }, 400);

        // Virtual Window Observer: Render canvas when near viewport, evict when far
        state.pageObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            const pageNum = parseInt(entry.target.getAttribute('data-page-num'), 10);
            const canvas = entry.target.querySelector('canvas');
            if (!canvas) return;

            if (entry.isIntersecting) {
              if (!canvas.getAttribute('data-rendered')) {
                canvas.setAttribute('data-rendered', 'true');
                renderPageCanvasToContainer(docObj, pageNum, entry.target, canvas, scale, outputScale);
              }
            } else {
              // Memory Optimization: Evict canvases > 1400px outside viewport to keep RAM usage tiny for large PDFs
              const rect = entry.boundingClientRect;
              const rootRect = DOM.viewerStage.getBoundingClientRect();
              const isFarAbove = rect.bottom < rootRect.top - 1400;
              const isFarBelow = rect.top > rootRect.bottom + 1400;

              if ((isFarAbove || isFarBelow) && pageNum !== state.currentPageNum && pageNum > 1) {
                if (canvas.getAttribute('data-rendered')) {
                  canvas.removeAttribute('data-rendered');
                  canvas.width = 0;
                  canvas.height = 0;
                  const textLayer = entry.target.querySelector('.textLayer');
                  if (textLayer) textLayer.innerHTML = '';
                }
              }
            }
          });
        }, {
          root: DOM.viewerStage,
          rootMargin: '800px 0px 800px 0px',
          threshold: 0.01
        });

        pageContainers.forEach(el => state.pageObserver.observe(el));

        // Active Page Observer (Detects visible page in viewport)
        state.activePageObserver = new IntersectionObserver((entries) => {
          if (state.isScrollingToPage) return;

          let maxRatio = 0;
          let activePageNum = state.currentPageNum;

          entries.forEach(entry => {
            if (entry.intersectionRatio > maxRatio) {
              maxRatio = entry.intersectionRatio;
              activePageNum = parseInt(entry.target.getAttribute('data-page-num'), 10);
            }
          });

          if (maxRatio > 0.15 && activePageNum !== state.currentPageNum) {
            state.currentPageNum = activePageNum;
            DOM.pageNumInput.value = activePageNum;
            saveCurrentDocumentPage(activePageNum);

            document.querySelectorAll('.pdf-page-container').forEach(c => {
              const num = parseInt(c.getAttribute('data-page-num'), 10);
              c.classList.toggle('active-page', num === activePageNum);
            });

            updateThumbnailSelection();
          }
        }, {
          root: DOM.viewerStage,
          threshold: [0.1, 0.3, 0.5, 0.8]
        });

        pageContainers.forEach(el => state.activePageObserver.observe(el));

      } catch (err) {
        console.error("Error setting up continuous view layout", err);
      } finally {
        showLoader(false);
      }
    }
  }

  async function forceRenderPageNeighborhood(docObj, targetPageNum) {
    if (!docObj || !docObj.pdfDoc || docObj.id !== state.currentDocId) return;
    const start = Math.max(1, targetPageNum - 2);
    const end = Math.min(docObj.totalPages, targetPageNum + 2);
    for (let i = start; i <= end; i++) {
      const container = document.getElementById(`pdf-page-${i}`);
      const canvas = container ? container.querySelector('canvas') : null;
      if (container && canvas && !canvas.getAttribute('data-rendered')) {
        canvas.setAttribute('data-rendered', 'true');
        const page1 = await docObj.pdfDoc.getPage(1);
        const unscaledViewport = page1.getViewport({ scale: 1.0, rotation: state.rotation });
        const scale = calculateFitScale(unscaledViewport);
        const outputScale = window.devicePixelRatio || 1;
        await renderPageCanvasToContainer(docObj, i, container, canvas, scale, outputScale);
      }
    }
  }

  async function renderSinglePageCanvas(docObj, pageNum, canvas) {
    if (!docObj || !docObj.pdfDoc || docObj.id !== state.currentDocId) return;
    showLoader(true, "Rendering page...");
    try {
      const page = await docObj.pdfDoc.getPage(pageNum);
      const unscaledViewport = page.getViewport({ scale: 1.0, rotation: state.rotation });
      const scale = calculateFitScale(unscaledViewport);

      const outputScale = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: scale, rotation: state.rotation });

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = Math.floor(viewport.width) + "px";
      canvas.style.height = Math.floor(viewport.height) + "px";

      const parentContainer = canvas.parentElement;
      if (parentContainer) {
        parentContainer.style.width = Math.floor(viewport.width) + "px";
        parentContainer.style.height = Math.floor(viewport.height) + "px";
        parentContainer.style.setProperty('--scale-factor', viewport.scale);
      }

      const ctx = canvas.getContext('2d');
      ctx.scale(outputScale, outputScale);

      await page.render({ canvasContext: ctx, viewport: viewport }).promise;

      // Render Text Selection Layer
      if (parentContainer) {
        let textLayerDiv = parentContainer.querySelector('.textLayer');
        if (!textLayerDiv) {
          textLayerDiv = document.createElement('div');
          textLayerDiv.className = 'textLayer';
          parentContainer.appendChild(textLayerDiv);
        } else {
          textLayerDiv.innerHTML = '';
        }

        textLayerDiv.style.width = Math.floor(viewport.width) + "px";
        textLayerDiv.style.height = Math.floor(viewport.height) + "px";
        textLayerDiv.style.setProperty('--scale-factor', viewport.scale);

        try {
          const textContent = await page.getTextContent();
          if (pdfjsLib.renderTextLayer) {
            pdfjsLib.renderTextLayer({
              textContentSource: textContent,
              container: textLayerDiv,
              viewport: viewport,
              textDivs: []
            });
          }
        } catch (textErr) {
          console.error("Text layer rendering notice", textErr);
        }
      }
    } catch (e) {
      console.error("Error rendering single page canvas", e);
    } finally {
      showLoader(false);
    }
  }

  async function renderPageCanvasToContainer(docObj, pageNum, containerEl, canvasEl, scale, outputScale) {
    if (!docObj || !docObj.pdfDoc || docObj.id !== state.currentDocId) return;
    try {
      const page = await docObj.pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: scale, rotation: state.rotation });

      canvasEl.width = Math.floor(viewport.width * outputScale);
      canvasEl.height = Math.floor(viewport.height * outputScale);
      canvasEl.style.width = Math.floor(viewport.width) + "px";
      canvasEl.style.height = Math.floor(viewport.height) + "px";

      containerEl.style.width = Math.floor(viewport.width) + "px";
      containerEl.style.height = Math.floor(viewport.height) + "px";
      containerEl.style.setProperty('--scale-factor', viewport.scale);

      const ctx = canvasEl.getContext('2d');
      ctx.scale(outputScale, outputScale);

      await page.render({ canvasContext: ctx, viewport: viewport }).promise;

      // Defer text selection layer rendering to allow graphic canvas to display instantly
      setTimeout(async () => {
        if (!docObj || !docObj.pdfDoc || docObj.id !== state.currentDocId) return;
        try {
          let textLayerDiv = containerEl.querySelector('.textLayer');
          if (!textLayerDiv) {
            textLayerDiv = document.createElement('div');
            textLayerDiv.className = 'textLayer';
            containerEl.appendChild(textLayerDiv);
          } else {
            textLayerDiv.innerHTML = '';
          }

          textLayerDiv.style.width = Math.floor(viewport.width) + "px";
          textLayerDiv.style.height = Math.floor(viewport.height) + "px";
          textLayerDiv.style.setProperty('--scale-factor', viewport.scale);

          const textContent = await page.getTextContent();
          if (pdfjsLib.renderTextLayer) {
            pdfjsLib.renderTextLayer({
              textContentSource: textContent,
              container: textLayerDiv,
              viewport: viewport,
              textDivs: []
            });
          }
        } catch (textErr) {
          console.warn("Text layer rendering notice", textErr);
        }
      }, 40);
    } catch (e) {
      if (docObj && docObj.id === state.currentDocId) {
        console.error(`Error rendering page ${pageNum} in continuous view`, e);
      }
    }
  }

  function renderCurrentPage() {
    renderCurrentDocument();
  }

  function clearCanvas() {
    DOM.pdfViewWrapper.innerHTML = '';
  }

  // Thumbnails in Sidebar
  async function renderSidebarThumbnails() {
    const docObj = state.documents.find(d => d.id === state.currentDocId);
    if (!docObj) {
      DOM.thumbsList.innerHTML = `<div class="empty-state"><i data-lucide="image"></i><p>No document selected</p></div>`;
      initIcons();
      return;
    }

    DOM.thumbsList.innerHTML = '';

    for (let i = 1; i <= docObj.totalPages; i++) {
      const card = document.createElement('div');
      card.className = `thumb-card ${i === state.currentPageNum ? 'active' : ''}`;
      card.setAttribute('data-page', i);

      const canvas = document.createElement('canvas');
      card.appendChild(canvas);

      const label = document.createElement('span');
      label.className = 'thumb-num';
      label.textContent = `Page ${i}`;
      card.appendChild(label);

      card.addEventListener('click', () => jumpToPage(i));
      DOM.thumbsList.appendChild(card);

      // Render thumbnail asynchronously
      (async (pageNum, canvasEl) => {
        try {
          const page = await docObj.pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale: 0.2 });
          canvasEl.width = viewport.width;
          canvasEl.height = viewport.height;
          const ctx = canvasEl.getContext('2d');
          await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        } catch (e) {
          console.error("Thumbnail error", e);
        }
      })(i, canvas);
    }
  }

  function updateThumbnailSelection() {
    document.querySelectorAll('.thumb-card').forEach(card => {
      const pg = parseInt(card.getAttribute('data-page'), 10);
      card.classList.toggle('active', pg === state.currentPageNum);
    });
  }

  // Navigation Controls
  function changePage(delta) {
    const docObj = state.documents.find(d => d.id === state.currentDocId);
    if (!docObj) return;

    const newPage = state.currentPageNum + delta;
    if (newPage >= 1 && newPage <= docObj.totalPages) {
      jumpToPage(newPage);
    }
  }

  async function forceRenderPageNeighborhood(docObj, targetPage) {
    if (state.layoutMode !== 'continuous') return;

    const total = docObj.totalPages;
    const neighborhood = [
      targetPage,
      targetPage - 1,
      targetPage + 1,
      targetPage - 2,
      targetPage + 2
    ].filter(p => p >= 1 && p <= total);

    try {
      const page1 = await docObj.pdfDoc.getPage(1);
      const unscaledViewport = page1.getViewport({ scale: 1.0, rotation: state.rotation });
      const scale = calculateFitScale(unscaledViewport);

      const outputScale = window.devicePixelRatio || 1;

      for (const pNum of neighborhood) {
        const containerEl = document.getElementById(`pdf-page-${pNum}`);
        if (containerEl) {
          const canvasEl = containerEl.querySelector('canvas');
          if (canvasEl && !canvasEl.getAttribute('data-rendered')) {
            canvasEl.setAttribute('data-rendered', 'true');
            renderPageCanvasToContainer(docObj, pNum, containerEl, canvasEl, scale, outputScale);
          }
        }
      }
    } catch (err) {
      console.warn("Priority neighborhood rendering notice:", err);
    }
  }

  function jumpToPage(pageNum) {
    const docObj = state.documents.find(d => d.id === state.currentDocId);
    if (!docObj) return;

    if (pageNum >= 1 && pageNum <= docObj.totalPages) {
      state.currentPageNum = pageNum;
      DOM.pageNumInput.value = pageNum;
      saveCurrentDocumentPage(pageNum);
      updateThumbnailSelection();

      if (state.layoutMode === 'continuous') {
        const targetEl = document.getElementById(`pdf-page-${pageNum}`);
        if (targetEl) {
          state.isScrollingToPage = true;
          document.querySelectorAll('.pdf-page-container').forEach(c => {
            const num = parseInt(c.getAttribute('data-page-num'), 10);
            c.classList.toggle('active-page', num === pageNum);
          });
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

          // Priority render target page & surrounding neighborhood (p-2..p+2)
          forceRenderPageNeighborhood(docObj, pageNum);

          setTimeout(() => {
            state.isScrollingToPage = false;
          }, 600);
        }
      } else {
        renderCurrentDocument();
      }
    }
  }

  function modifyZoom(delta) {
    if (typeof state.zoomScale !== 'number') {
      state.zoomScale = 1.0;
    }
    state.zoomScale = Math.min(3.0, Math.max(0.4, state.zoomScale + delta));
    DOM.zoomSelect.value = state.zoomScale.toString();
    renderCurrentDocument();
  }

  function rotateViewer(angleDelta) {
    state.rotation = (state.rotation + angleDelta + 360) % 360;
    renderCurrentDocument();
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      DOM.viewerStage.requestFullscreen().catch(err => {
        console.error("Fullscreen failed", err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  function handleKeyboardShortcuts(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      changePage(1);
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      changePage(-1);
    } else if (e.key === '+' || e.key === '=') {
      modifyZoom(0.2);
    } else if (e.key === '-') {
      modifyZoom(-0.2);
    }
  }

  // ==========================================================================
  // Export Modal & N-Up Page Layout Engine
  // ==========================================================================

  function openExportModal() {
    if (!state.currentDocId) {
      alert("Please open or select a PDF document first before exporting.");
      return;
    }

    DOM.exportModal.classList.remove('hidden');
    state.export.currentPreviewSheet = 1;
    updateExportPreview();
  }

  function closeExportModal() {
    DOM.exportModal.classList.add('hidden');
  }

  // Parse page range input string like "1-3, 5, 8-10"
  function parsePageRange(rangeStr, totalPages) {
    if (!rangeStr || !rangeStr.trim()) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = new Set();
    const parts = rangeStr.split(',');

    parts.forEach(part => {
      part = part.trim();
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(p => parseInt(p.trim(), 10));
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
            if (i >= 1 && i <= totalPages) pages.add(i);
          }
        }
      } else {
        const val = parseInt(part, 10);
        if (!isNaN(val) && val >= 1 && val <= totalPages) {
          pages.add(val);
        }
      }
    });

    const sorted = Array.from(pages).sort((a, b) => a - b);
    return sorted.length > 0 ? sorted : Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Get paper dimension specifications in Inches and Points (1 in = 72 pt)
  function getPaperDimensions(sizeKey, orientation) {
    let widthIn = 8.0;
    let heightIn = 11.0;

    switch (sizeKey) {
      case '8x13':
        widthIn = 8.0;
        heightIn = 13.0; // Philippine Law / Long Legal Standard
        break;
      case '8x11':
        widthIn = 8.0;
        heightIn = 11.0;
        break;
      case 'a4':
        widthIn = 8.2677;
        heightIn = 11.6929; // A4 standard (210mm x 297mm)
        break;
    }

    if (orientation === 'landscape') {
      const temp = widthIn;
      widthIn = heightIn;
      heightIn = temp;
    }

    return {
      widthIn,
      heightIn,
      widthPt: widthIn * 72,
      heightPt: heightIn * 72
    };
  }

  function getMarginInches(marginKey) {
    switch (marginKey) {
      case 'none': return 0.0;
      case 'tight': return 0.15;
      case 'normal': return 0.3;
      case 'wide': return 0.5;
      default: return 0.3;
    }
  }

  function updateExportPreview() {
    const docObj = state.documents.find(d => d.id === state.currentDocId);
    if (!docObj) return;

    const targetPages = parsePageRange(state.export.pageRange, docObj.totalPages);
    const nupCapacity = state.export.nupCols * state.export.nupRows;
    const totalSheets = Math.ceil(targetPages.length / nupCapacity) || 1;

    state.export.totalPreviewSheets = totalSheets;
    if (state.export.currentPreviewSheet > totalSheets) {
      state.export.currentPreviewSheet = totalSheets;
    }

    // Update Stats Summary UI
    DOM.sumSourcePages.textContent = targetPages.length + " Page(s)";

    const paperSpec = getPaperDimensions(state.export.paperSize, state.export.orientation);
    const sizeTitle = (state.export.paperSize === '8x13') ? '8" x 13"' :
      (state.export.paperSize === '8x11') ? '8" x 11"' : 'A4 (8.27" x 11.69")';
    DOM.sumPaperSpec.textContent = `${sizeTitle} (${state.export.orientation})`;
    DOM.sumOutputSheets.textContent = `${totalSheets} Sheet(s)`;

    DOM.currentSheetNum.textContent = state.export.currentPreviewSheet;
    DOM.totalSheetsNum.textContent = totalSheets;

    renderExportSheetPreview();
  }

  // Render the current preview sheet canvas inside modal
  async function renderExportSheetPreview() {
    const docObj = state.documents.find(d => d.id === state.currentDocId);
    if (!docObj) return;

    const targetPages = parsePageRange(state.export.pageRange, docObj.totalPages);
    const paperSpec = getPaperDimensions(state.export.paperSize, state.export.orientation);

    // Set Sheet Paper Container Aspect Ratio & Dimensions
    const stageMaxW = 550;
    const stageMaxH = 450;
    const scaleFactor = Math.min(stageMaxW / paperSpec.widthPt, stageMaxH / paperSpec.heightPt);

    const canvasW = Math.floor(paperSpec.widthPt * scaleFactor);
    const canvasH = Math.floor(paperSpec.heightPt * scaleFactor);

    DOM.previewCanvas.width = canvasW;
    DOM.previewCanvas.height = canvasH;

    DOM.previewSheetStage.style.width = canvasW + "px";
    DOM.previewSheetStage.style.height = canvasH + "px";

    const ctx = DOM.previewCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Calculate Grid Layout Geometry
    const marginPt = getMarginInches(state.export.margin) * 72;
    const footerGapPt = state.export.drawPageNumbers ? 18 : 0;

    const availableW = paperSpec.widthPt - (marginPt * 2);
    const availableH = paperSpec.heightPt - (marginPt * 2) - footerGapPt;

    const cols = state.export.nupCols;
    const rows = state.export.nupRows;
    const gapPt = 8; // Spacing between tiles

    const tileW = (availableW - (gapPt * (cols - 1))) / cols;
    const tileH = (availableH - (gapPt * (rows - 1))) / rows;

    const sheetIndex = state.export.currentPreviewSheet - 1;
    const nupCapacity = cols * rows;
    const startIndex = sheetIndex * nupCapacity;
    const pageSlice = targetPages.slice(startIndex, startIndex + nupCapacity);

    // Render Sub-Page Tiles
    for (let i = 0; i < pageSlice.length; i++) {
      const pageNum = pageSlice[i];
      const colIndex = i % cols;
      const rowIndex = Math.floor(i / cols);

      const tileXPt = marginPt + colIndex * (tileW + gapPt);
      const tileYPt = marginPt + rowIndex * (tileH + gapPt);

      // Convert Pt coordinates to Canvas preview coordinates
      const x = tileXPt * scaleFactor;
      const y = tileYPt * scaleFactor;
      const w = tileW * scaleFactor;
      const h = tileH * scaleFactor;

      // Draw PDF Page Content
      try {
        const pageCanvas = await getRenderedPageCanvas(docObj.pdfDoc, pageNum);

        // Fit PDF page proportionally into tile box
        const aspect = pageCanvas.width / pageCanvas.height;
        let drawW = w;
        let drawH = w / aspect;

        if (drawH > h) {
          drawH = h;
          drawW = h * aspect;
        }

        const offsetX = x + (w - drawW) / 2;
        const offsetY = y + (h - drawH) / 2;

        ctx.drawImage(pageCanvas, offsetX, offsetY, drawW, drawH);

        // Draw sub-page border
        if (state.export.drawBorders) {
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1;
          ctx.strokeRect(offsetX, offsetY, drawW, drawH);
        }

        // Sub-page label (e.g., P.1)
        ctx.fillStyle = '#64748b';
        ctx.font = '10px sans-serif';
        ctx.fillText(`P.${pageNum}`, offsetX + 4, offsetY + 12);

      } catch (e) {
        console.error("Preview render page error", e);
      }
    }

    // Draw Footer Page Numbering on Sheet
    if (state.export.drawPageNumbers) {
      ctx.fillStyle = '#475569';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      const footerY = (paperSpec.heightPt - 10) * scaleFactor;
      ctx.fillText(`Sheet ${state.export.currentPreviewSheet} of ${state.export.totalPreviewSheets}`, canvasW / 2, footerY);
    }
  }

  // Helper to render and cache PDF page canvas at 2x resolution
  async function getRenderedPageCanvas(pdfDoc, pageNum) {
    const cacheKey = `${state.currentDocId}_p${pageNum}`;
    if (state.export.renderedPagesCache[cacheKey]) {
      return state.export.renderedPagesCache[cacheKey];
    }

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

    state.export.renderedPagesCache[cacheKey] = canvas;
    return canvas;
  }

  // Generate & Download the Final Formatted N-Up PDF
  async function runPDFExport() {
    const docObj = state.documents.find(d => d.id === state.currentDocId);
    if (!docObj) return;

    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert("jsPDF library is not loaded properly.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const targetPages = parsePageRange(state.export.pageRange, docObj.totalPages);
    const paperSpec = getPaperDimensions(state.export.paperSize, state.export.orientation);

    const cols = state.export.nupCols;
    const rows = state.export.nupRows;
    const nupCapacity = cols * rows;
    const totalSheets = Math.ceil(targetPages.length / nupCapacity);

    // Initialize jsPDF document with exact paper size in inches
    const pdfExport = new jsPDF({
      orientation: state.export.orientation,
      unit: 'in',
      format: [paperSpec.widthIn, paperSpec.heightIn]
    });

    const marginIn = getMarginInches(state.export.margin);
    const footerGapIn = state.export.drawPageNumbers ? 0.25 : 0;

    const availableWIn = paperSpec.widthIn - (marginIn * 2);
    const availableHIn = paperSpec.heightIn - (marginIn * 2) - footerGapIn;

    const gapIn = 0.1; // 0.1 inch spacing between grid cells
    const tileWIn = (availableWIn - (gapIn * (cols - 1))) / cols;
    const tileHIn = (availableHIn - (gapIn * (rows - 1))) / rows;

    showExportProgress(true, 0, "Starting PDF generation...");

    for (let sheet = 0; sheet < totalSheets; sheet++) {
      if (sheet > 0) {
        pdfExport.addPage([paperSpec.widthIn, paperSpec.heightIn], state.export.orientation);
      }

      const startIndex = sheet * nupCapacity;
      const pageSlice = targetPages.slice(startIndex, startIndex + nupCapacity);

      for (let i = 0; i < pageSlice.length; i++) {
        const pageNum = pageSlice[i];
        const colIndex = i % cols;
        const rowIndex = Math.floor(i / cols);

        const tileX = marginIn + colIndex * (tileWIn + gapIn);
        const tileY = marginIn + rowIndex * (tileHIn + gapIn);

        // Fetch rendered page canvas image
        const pageCanvas = await getRenderedPageCanvas(docObj.pdfDoc, pageNum);
        const imgData = pageCanvas.toDataURL('image/jpeg', 0.92);

        const aspect = pageCanvas.width / pageCanvas.height;
        let drawW = tileWIn;
        let drawH = tileWIn / aspect;

        if (drawH > tileHIn) {
          drawH = tileHIn;
          drawW = tileHIn * aspect;
        }

        const offsetX = tileX + (tileWIn - drawW) / 2;
        const offsetY = tileY + (tileHIn - drawH) / 2;

        pdfExport.addImage(imgData, 'JPEG', offsetX, offsetY, drawW, drawH);

        // Draw sub-page border lines
        if (state.export.drawBorders) {
          pdfExport.setDrawColor(200, 200, 200);
          pdfExport.setLineWidth(0.01);
          pdfExport.rect(offsetX, offsetY, drawW, drawH);
        }
      }

      // Draw footer sheet number
      if (state.export.drawPageNumbers) {
        pdfExport.setFont("Helvetica", "normal");
        pdfExport.setFontSize(9);
        pdfExport.setTextColor(120, 120, 120);
        pdfExport.text(`Sheet ${sheet + 1} of ${totalSheets}`, paperSpec.widthIn / 2, paperSpec.heightIn - (marginIn / 2 || 0.15), { align: 'center' });
      }

      const progress = Math.round(((sheet + 1) / totalSheets) * 100);
      showExportProgress(true, progress, `Processing sheet ${sheet + 1} of ${totalSheets}...`);
    }

    // Save output PDF file
    const cleanDocName = docObj.name.replace(/\.pdf$/i, '');
    const paperLabel = state.export.paperSize.toUpperCase();
    const outputFilename = `Exported_${cleanDocName}_${paperLabel}_${cols}x${rows}Up.pdf`;

    pdfExport.save(outputFilename);

    showExportProgress(false, 100, "Download complete!");
    setTimeout(() => {
      closeExportModal();
    }, 1200);
  }

  function showExportProgress(showBar, percent, text) {
    DOM.exportStatusText.textContent = text;
    if (showBar) {
      DOM.exportProgressBar.classList.remove('hidden');
      DOM.exportProgressFill.style.width = percent + '%';
    } else {
      DOM.exportProgressBar.classList.add('hidden');
    }
  }

  // Helpers
  function showLoader(show, text = "Loading...") {
    if (show) {
      DOM.viewerLoader.querySelector('span').textContent = text;
      DOM.viewerLoader.classList.remove('hidden');
    } else {
      DOM.viewerLoader.classList.add('hidden');
    }
  }

  function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

})();
