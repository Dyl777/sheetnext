/**
 * LibraryLoader - Dynamically loads external libraries from CDN
 * Supports: PDF.js, Mammoth.js, XLSX, JSZip
 */

export default class LibraryLoader {
    static libraries = {
        pdfjsLib: {
            name: 'PDF.js',
            url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
            global: 'pdfjsLib'
        },
        mammoth: {
            name: 'Mammoth.js',
            url: 'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js',
            global: 'mammoth'
        },
        XLSX: {
            name: 'XLSX',
            url: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
            global: 'XLSX'
        },
        JSZip: {
            name: 'JSZip',
            url: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
            global: 'JSZip'
        }
    };

    static loadedLibraries = new Set();

    /**
     * Load a specific library
     */
    static async loadLibrary(libraryName) {
        if (this.loadedLibraries.has(libraryName)) {
            return window[this.libraries[libraryName].global];
        }

        const library = this.libraries[libraryName];
        if (!library) {
            throw new Error(`Unknown library: ${libraryName}`);
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = library.url;
            script.onload = () => {
                this.loadedLibraries.add(libraryName);
                resolve(window[library.global]);
            };
            script.onerror = () => {
                reject(new Error(`Failed to load ${library.name} from ${library.url}`));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Load multiple libraries
     */
    static async loadLibraries(libraryNames) {
        const promises = libraryNames.map(name => this.loadLibrary(name));
        return Promise.all(promises);
    }

    /**
     * Load all document processing libraries
     */
    static async loadAllDocumentLibraries() {
        try {
            await this.loadLibraries(['pdfjsLib', 'mammoth', 'XLSX', 'JSZip']);
            console.log('✓ All document processing libraries loaded');
            return true;
        } catch (error) {
            console.warn('Some libraries failed to load:', error);
            // Don't throw - libraries are optional for document processing
            return false;
        }
    }

    /**
     * Check if library is loaded
     */
    static isLoaded(libraryName) {
        return this.loadedLibraries.has(libraryName);
    }

    /**
     * Get load status of all libraries
     */
    static getLoadStatus() {
        const status = {};
        for (const [name, lib] of Object.entries(this.libraries)) {
            status[name] = {
                loaded: this.loadedLibraries.has(name),
                name: lib.name,
                url: lib.url
            };
        }
        return status;
    }
}

// Auto-load common libraries on initialization
if (typeof window !== 'undefined') {
    window.LibraryLoader = LibraryLoader;
    
    // Optionally pre-load on app startup (comment out if not needed)
    // LibraryLoader.loadAllDocumentLibraries().catch(err => console.warn('Library preload warning:', err));
}

export default LibraryLoader;
