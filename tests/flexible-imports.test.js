import {test} from 'node:test';
import assert from 'node:assert/strict';
import {flexibleRows} from '../src/lib/flexibleRows.js';
test('arbitrary rows preserve first row and missing cells without contact fields',()=>{assert.deepEqual(flexibleRows([['Product','Amount'],['Book',20],[],['Pen']]),[{'Column 1':'Product','Column 2':'Amount'},{'Column 1':'Book','Column 2':20},{'Column 1':'Pen','Column 2':''}]);});
