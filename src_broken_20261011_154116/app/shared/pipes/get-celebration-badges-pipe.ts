import { Pipe, PipeTransform } from '@angular/core';
import {
  addYears,
  differenceInCalendarYears,
  isToday,
  isValid,
  parse,
  parseISO,
  subMinutes,
} from 'date-fns';

export interface CelebrationBadge {
  kind: 'birthday' | 'anniversary';
  /** `pi` icon plus its light/dark text colour classes. */
  icon: string;
  label: string;
}

/** The staffMember list sends UTC timestamps as `MM/dd/yyyy HH:mm:ss` (e.g. `10/03/1997 18:30:00`). */
const API_DATE_FORMAT = 'MM/dd/yyyy HH:mm:ss';

/** Local date for an API timestamp or ISO string; `null` when missing or invalid. */
function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  // `parse` reads the API timestamp as local time; shift by the offset to treat it as UTC.
  const apiDate = parse(value, API_DATE_FORMAT, new Date());
  if (isValid(apiDate)) return subMinutes(apiDate, apiDate.getTimezoneOffset());
  const isoDate = parseISO(value);
  return isValid(isoDate) ? isoDate : null;
}

/** `addYears` clamps Feb 29 to Feb 28 in non-leap years, so those dates still fall once a year. */
function fallsToday(date: Date): boolean {
  return isToday(addYears(date, differenceInCalendarYears(new Date(), date)));
}

@Pipe({
  name: 'getCelebrationBadges',
})
export class GetCelebrationBadgesPipe implements PipeTransform {
  transform(dateOfBirth: string | undefined, dateOfOnBoarding?: string): CelebrationBadge[] {
    const badges: CelebrationBadge[] = [];

    const birth = parseDate(dateOfBirth);
    if (birth && fallsToday(birth)) {
      badges.push({
        kind: 'birthday',
        icon: 'pi-gift text-pink-700 dark:text-pink-400',
        label: 'Birthday today',
      });
    }

    const joined = parseDate(dateOfOnBoarding);
    const years = joined ? differenceInCalendarYears(new Date(), joined) : 0;
    if (joined && years >= 1 && fallsToday(joined)) {
      badges.push({
        kind: 'anniversary',
        icon: 'pi-crown text-amber-700 dark:text-amber-400',
        label: `${years} yr work anniversary`,
      });
    }

    return badges;
  }
}
