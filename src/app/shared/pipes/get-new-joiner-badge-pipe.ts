import { Pipe, PipeTransform } from '@angular/core';

export interface NewJoinerBadge {
  label: string;
  color: string;
  bgColor: string;
}

@Pipe({
  name: 'getNewJoinerBadge',
})
export class GetNewJoinerBadgePipe implements PipeTransform {
  transform(dateOfOnBoarding: string | undefined): NewJoinerBadge | null {
    if (!dateOfOnBoarding) return null;

    const joinDate = new Date(dateOfOnBoarding);
    if (isNaN(joinDate.getTime())) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    joinDate.setHours(0, 0, 0, 0);

    const diffMs = today.getTime() - joinDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return { label: 'Joined Today', color: '#ffffff', bgColor: '#22c55e' };
    }

    if (diffDays === 1) {
      return { label: 'Joined Yesterday', color: '#ffffff', bgColor: '#3b82f6' };
    }

    if (diffDays >= 2 && diffDays <= 3) {
      return { label: `Joined ${diffDays}d ago`, color: '#ffffff', bgColor: '#f59e0b' };
    }

    return null;
  }
}
