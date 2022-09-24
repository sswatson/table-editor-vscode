// taken from here, with types added:
// https://github.com/brandon93s/html-table-to-json/blob/master/index.js
import { load } from 'cheerio';
import type { CheerioAPI, Element } from 'cheerio';

interface Record {
  [key: string]: string;
}

interface Options {
  values?: boolean;
}

class HtmlTableToJson {
  html: string;
  opts: Options;
  _$: CheerioAPI;
  _results: Record[][];
  _headers: string[][];
  _count: number | null;
  _firstRowUsedAsHeaders: boolean[];

	constructor(html: string, options: Options = {}) {
		if (typeof html !== 'string') {
			throw new TypeError('html input must be a string')
		}

		this.html = html
		this.opts = options

		this._$ = load(this.html)
		this._results = []
		this._headers = []
		this._count = null

		this._firstRowUsedAsHeaders = []

		this._process()
	}

	static parse(html: string, options?: Options) {
		return new HtmlTableToJson(html, options);
	}

	get count() {
		if (Number.isInteger(this._count) === false) {
			this._count = this._$('table').get().length;
		}

		return this._count;
	}

	get results() {
		return this.opts.values === true 
      ? this._results.map(result => result.map(r => Object.values(r))) 
      : this._results
	}

	get headers() {
		return this._headers
	}

	_process() {
		if (this._results.length > 0) {
			return this._results
		}

		this._$('table').each((i, element) => this._processTable(i, element));

		return this._results
	}

	_processTable(tableIndex: number, table: Element) {
		this._results[tableIndex] = []
		this._buildHeaders(tableIndex, table)

		this._$(table).find('tr').each((i, element) => this._processRow(tableIndex, i, element))
		this._pruneEmptyRows(tableIndex)
	}

	_processRow(tableIndex: number, index: number, row: Element) {
		if (index === 0 && this._firstRowUsedAsHeaders[tableIndex] === true) {
			return
		}

		this._results[tableIndex][index] = {}

		this._$(row).find('td').each((i, cell) => {
			this._results[tableIndex][index][this._headers[tableIndex][i] || (i + 1)] = this._$(cell).text().trim()
		})
	}

	_buildHeaders(index: number, table: Element) {
		this._headers[index] = []

		this._$(table).find('tr').each((i, row) => {
			this._$(row).find('th').each((j, cell) => {
				this._headers[index][j] = this._$(cell).text().trim()
			})
		})

		if (this._headers[index].length > 0) {
			return
		}

		this._firstRowUsedAsHeaders[index] = true
		this._$(table).find('tr').first().find('td').each((j, cell) => {
			this._headers[index][j] = this._$(cell).text().trim()
		})
	}

	_pruneEmptyRows(tableIndex: number) {
		this._results[tableIndex] = (
      this._results[tableIndex]
      .filter(t => Object.keys(t).length)
    );
	}
}

export default HtmlTableToJson;