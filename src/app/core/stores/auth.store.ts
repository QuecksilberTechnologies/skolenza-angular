import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import { CommonMenuApi } from '@core/services/common-menu-api';
import { HostApi } from '@core/services/host-api';
import { StorageApi } from '@core/services/storage-api';
import {
  CommonMenuItem,
  HostUser,
  LoginInfo,
  SessionHostRole,
  SessionHostUser,
  SessionUser,
} from '@shared/interfaces';
import { HOST_ROLE_TYPE_ID, isHostLogin } from '@shared/utilities/login-info';

interface AuthState {
  user: SessionUser | null;
  userType: string | null;
  /** Host identity straight off the login payload — enough to paint the header immediately. */
  sessionHost: SessionHostUser | null;
  hostRole: SessionHostRole | null;
  /** Full host record from `/Host/get-host-user-by-id`; the host screens read this one. */
  hostUser: HostUser | null;
  userMenuItems: CommonMenuItem[];
  /** True while `/CommonMenu` is in flight, so the dropdown shows a busy state instead
   *  of the seeded logout-only list. */
  isUserMenuLoading: boolean;
  isLoggedIn: boolean;
}

const LOGOUT_MODULE_NAME = 'sign-out';

/** The dropdown's logout row is identified by name, never by position — `itemPriority`
 *  can order the CommonMenu children either way round. */
export const isLogoutMenuItem = (item: CommonMenuItem): boolean =>
  item.moduleName?.toLowerCase() === LOGOUT_MODULE_NAME ||
  item.urlPath?.toLowerCase() === LOGOUT_MODULE_NAME;

/** The dropdown needs a logout row, so an empty or failed CommonMenu falls back to
 *  this one rather than leaving the session with no way to sign out. */
const LOGOUT_MENU_ITEM: CommonMenuItem = {
  moduleId: 0,
  moduleName: 'Sign-Out',
  displayName: 'Sign out',
  urlPath: LOGOUT_MODULE_NAME,
  imageIconWeb: null,
  imageIconMobile: null,
  isLeafNode: true,
  itemPriority: -1,
  children: [],
};

/** The dropdown is the CommonMenu "Profile" root; hosts have no such root, so fall
 *  back to the synthesized logout item rather than a hard-coded index. Logout is
 *  pinned last because the template styles the closing row as the sign-out action. */
const userMenuItemsFrom = (roots: CommonMenuItem[] | undefined): CommonMenuItem[] => {
  const profile = roots?.find((root) => root.moduleName?.toLowerCase() === 'profile');
  const items = profile?.children ?? [];

  if (!items.length) return [LOGOUT_MENU_ITEM];

  const links = items.filter((item) => !isLogoutMenuItem(item));
  const logout = items.filter(isLogoutMenuItem);

  return [...links, ...(logout.length ? logout : [LOGOUT_MENU_ITEM])];
};

const initialState: AuthState = {
  user: null,
  userType: null,
  sessionHost: null,
  hostRole: null,
  hostUser: null,
  // Seeded so the dropdown always offers a way out, including while /CommonMenu
  // is still in flight.
  userMenuItems: [LOGOUT_MENU_ITEM],
  isUserMenuLoading: false,
  isLoggedIn: false,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ user, userType, sessionHost, hostRole, hostUser }) => {
    const isHost = computed(() => userType() === 'Host');

    return {
      isHost,
      staffMemberFullName: computed(
        () => user()?.fullName || hostUser()?.name || sessionHost()?.name || 'Host',
      ),
      officialEmail: computed(
        () => user()?.officialEmail || hostUser()?.email || sessionHost()?.email || '',
      ),
      institutionName: computed(() => user()?.institutionName || (isHost() ? 'Skolenza Host' : '')),
      profileImageLink: computed(() => user()?.profileImageUrl || ''),
      userPrimaryRoleName: computed(
        () => user()?.primaryRole?.roleName || hostRole()?.name || hostUser()?.hostRoleName || '',
      ),
      roleTypeId: computed(
        () => user()?.primaryRole?.roleTypeId ?? (isHost() ? HOST_ROLE_TYPE_ID : undefined),
      ),
    };
  }),
  withComputed(({ userMenuItems, isHost }) => ({
    /** The dropdown always carries a logout row, so "empty" means the CommonMenu "Profile" root
     *  brought no links — a failed or renamed menu. Hosts have no such root by design. */
    hasNoUserMenuLinks: computed(
      () => !isHost() && !userMenuItems().some((item) => !isLogoutMenuItem(item)),
    ),
  })),
  withMethods((store) => {
    const storageApi = inject(StorageApi);
    const commonMenuApi = inject(CommonMenuApi);
    const hostApi = inject(HostApi);

    // Bumped on every session change so a response that lands after a logout (or after
    // the next login) cannot repopulate a store that has moved on.
    let sessionGeneration = 0;
    const isCurrent = (generation: number) => generation === sessionGeneration;

    const loadUserMenu = async (generation: number): Promise<void> => {
      try {
        const res = await firstValueFrom(commonMenuApi.getCommonMenu());
        if (isCurrent(generation))
          patchState(store, {
            userMenuItems: userMenuItemsFrom(res?.data),
            isUserMenuLoading: false,
          });
      } catch {
        if (isCurrent(generation))
          patchState(store, { userMenuItems: [LOGOUT_MENU_ITEM], isUserMenuLoading: false });
      }
    };

    /** The login payload carries only a thin host identity — the editable record lives in HostApi. */
    const loadHostUser = async (hostUserId: number, generation: number): Promise<void> => {
      try {
        const res = await firstValueFrom(hostApi.getHostUserById(hostUserId));
        if (isCurrent(generation)) patchState(store, { hostUser: res?.data ?? null });
      } catch {
        if (isCurrent(generation)) patchState(store, { hostUser: null });
      }
    };

    const applySession = (loginInfo: LoginInfo): void => {
      const generation = ++sessionGeneration;

      patchState(store, {
        user: loginInfo.user ?? null,
        userType: loginInfo.userType ?? null,
        sessionHost: loginInfo.hostUser ?? null,
        hostRole: loginInfo.hostRole ?? null,
        hostUser: null,
        userMenuItems: [LOGOUT_MENU_ITEM],
        isUserMenuLoading: true,
        isLoggedIn: true,
      });

      loadUserMenu(generation);

      const hostUserId = isHostLogin(loginInfo) ? loginInfo.hostUser?.hostUserId : undefined;
      if (hostUserId) loadHostUser(hostUserId, generation);
    };

    return {
      setLoginData(loginInfo: LoginInfo): void {
        applySession(loginInfo);
      },

      clearLoginData(): void {
        // Invalidates any in-flight menu/host fetch from the session being cleared.
        sessionGeneration++;
        patchState(store, initialState);
      },

      async updateStaffMemberName(fullName: string): Promise<void> {
        const current = store.user();
        if (!current) return;
        patchState(store, { user: { ...current, fullName } });
        // Sync to storage so the name persists across refreshes
        const loginInfo = (await storageApi.getItem('loginInfo')) as LoginInfo | null;
        if (loginInfo?.user) {
          loginInfo.user.fullName = fullName;
          await storageApi.setItem('loginInfo', loginInfo);
        }
      },

      /** `HostProfileStore.save()` has already persisted the change through `HostApi`;
       *  this mirrors it locally. The stored session carries `name`/`email` too, so it
       *  has to be updated as well or the header reverts to the old name on refresh. */
      async updateHostUserInfo(patch: Partial<HostUser>): Promise<void> {
        const current = store.hostUser();
        if (current) patchState(store, { hostUser: { ...current, ...patch } });

        const sessionHost = store.sessionHost();
        if (!sessionHost) return;

        const next: SessionHostUser = {
          ...sessionHost,
          name: patch.name ?? sessionHost.name,
          email: patch.email ?? sessionHost.email,
        };
        patchState(store, { sessionHost: next });

        const loginInfo = (await storageApi.getItem('loginInfo')) as LoginInfo | null;
        if (loginInfo?.hostUser) {
          loginInfo.hostUser = next;
          await storageApi.setItem('loginInfo', loginInfo);
        }
      },

      async updateProfileImageLink(imageLink: string): Promise<void> {
        const current = store.user();
        if (!current) return;
        patchState(store, { user: { ...current, profileImageUrl: imageLink } });
        const loginInfo = (await storageApi.getItem('loginInfo')) as LoginInfo | null;
        if (loginInfo?.user) {
          loginInfo.user.profileImageUrl = imageLink;
          await storageApi.setItem('loginInfo', loginInfo);
        }
      },

      async loadFromStorage(): Promise<void> {
        const loginInfo = (await storageApi.getItem('loginInfo')) as LoginInfo | null;
        if (loginInfo) applySession(loginInfo);
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.loadFromStorage();
    },
  }),
);
