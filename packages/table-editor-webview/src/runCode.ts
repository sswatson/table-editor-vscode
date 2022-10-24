
import dayjs from 'dayjs';
import _ from 'lodash-es';
import Chance from 'chance';

const chance = new Chance();

function functionFromString(code: string, preamble = '') {
  return new Function(`'use strict';${preamble};return ${code};`)();
}

export function functionWithUtilsFromString(
  argNames: string[], code: string, preamble = ''
) {
  return (...args: any[]) => functionFromString(
    `(_, dayjs, chance, ${argNames.join(", ")}) => ${code}`,
    preamble
  )(_, dayjs, chance, ...args);
}