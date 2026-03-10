import * as JsonIO from './JsonIO.js';

export default class IO {
    /** @param {import('../Workbook/Workbook.js').default} SN */
    constructor(SN) {
        /** @type {import('../Workbook/Workbook.js').default} */
        this._SN = SN;
    }

    async import() {
        console.log("IO Import Triggered");
    }

    async importFromUrl() {
        console.log("IO Import From URL Triggered");
    }

    export() {
        console.log("IO Export Triggered");
    }

    exportAllImage() {
        console.log("IO Export All Images Triggered");
    }
}

Object.assign(IO.prototype, {
    getData: JsonIO.getData,
    setData: JsonIO.setData,
    _setData: JsonIO.setData
});
