'use strict';

const notDeepStrictEqual = require('assert').notDeepStrictEqual;
const chalk = require('chalk');
const cliui = require('cliui');

const DEFAULT_TOTAL_WIDTH = 110;
const ISSUE_COL0_WIDTH = 5;
const ISSUE_COL1_WIDTH = 14;
const ISSUE_TITLE_WIDTH_MAX = 40;

const PAD_TOP0_LEFT2 = [0, 0, 0, 2];
const PAD_TOP1_LEFT0 = [1, 0, 0, 0];

class CliReporter {
  constructor (opts) {
    opts = opts || { width: DEFAULT_TOTAL_WIDTH, wrap: true };
    opts.width = parseInt(opts.width, 10) || DEFAULT_TOTAL_WIDTH;
    this.ui = cliui(opts);
    this.issueTitleWidth = Math.min(ISSUE_TITLE_WIDTH_MAX, parseInt((opts.width - ISSUE_COL0_WIDTH - ISSUE_COL1_WIDTH - 2) / 3.95, 10));
    this.styles = {
      'Deprecation': chalk.red,
      'Possible Bug': chalk.yellow,
      'Clarity': chalk.cyan,
      'Optimization': chalk.cyan
    };
    this.fileReports = {};
  }

  // group file items by line for easy reporting
  addFile (file, fileContent, items) {
    let self = this;
    if (!file) return self;
    let fileReport = self.fileReports[file] || {
      itemsByLine: {},
      uniqueIssues: 0,
      contentArray: (fileContent || '').replace('\r', '').split('\n')
    };
    let ibl = fileReport.itemsByLine;
    [].concat(items).forEach((item) => {
      if (ibl[String(item.line)]) {
        try {
          ibl[String(item.line)].forEach((lineItem) => {
            notDeepStrictEqual(item, lineItem);
          });
          ibl[String(item.line)].push(item);
          fileReport.uniqueIssues = fileReport.uniqueIssues + 1;
        } catch (err) {
          // ignore duplicate
        }
      } else {
        ibl[String(item.line)] = [ item ];
        fileReport.uniqueIssues = fileReport.uniqueIssues + 1;
      }
    });
    self.fileReports[file] = fileReport;
    return self;
  }

  // build a report object for data given via addFile
  buildReport () {
    let self = this;
    let totalIssues = 0;
    Object.keys(self.fileReports).forEach((file) => {
      let fileReport = self.fileReports[file];
      self.ui.div(
        { text: 'File:   ' + file, padding: PAD_TOP1_LEFT0 }
      );
      let linesWithItems = Object.keys(fileReport.itemsByLine);
      if (linesWithItems.length === 0) {
        self.ui.div('Issues: ' + chalk.green('None found') + ' 👍');
        return;
      }
      totalIssues += fileReport.uniqueIssues;
      self.ui.div('Issues: ' + String(fileReport.uniqueIssues));

      let itemNum = 1;
      linesWithItems.forEach((lineNum) => {
        self.ui.div({
          text: 'Line ' + lineNum + ': ' + chalk.magenta(fileReport.contentArray[parseInt(lineNum, 10) - 1]),
          padding: PAD_TOP1_LEFT0
        });
        self.ui.div(
          { text: 'Issue', width: ISSUE_COL0_WIDTH },
          { text: 'Category', padding: PAD_TOP0_LEFT2, width: ISSUE_COL1_WIDTH },
          { text: 'Title', padding: PAD_TOP0_LEFT2, width: self.issueTitleWidth },
          { text: 'Description', padding: PAD_TOP0_LEFT2 }
        );
        fileReport.itemsByLine[lineNum].forEach((item) => {
          let cat = item.category;
          let style = self.styles[cat] || self.styles['Clarity'];
          self.ui.div(
            { text: style(String(itemNum++)), width: ISSUE_COL0_WIDTH, align: 'right' },
            { text: style.inverse(item.category), padding: PAD_TOP0_LEFT2, width: ISSUE_COL1_WIDTH },
            { text: style(item.title), padding: PAD_TOP0_LEFT2, width: self.issueTitleWidth },
            { text: chalk.gray(item.description), padding: PAD_TOP0_LEFT2 }
          );
        });
      });
    });
    self.ui.div();
    return { toString: self.ui.toString.bind(self.ui), totalIssues: totalIssues };
  }
}

module.exports = CliReporter;
