import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Common, NavigationsApi } from '@core/services';
import { LoginInfo, Module, OperationalMenu } from '@shared/interfaces';
import { ButtonModule } from '@openng/optimus-ui/button';
import { IconFieldModule } from '@openng/optimus-ui/iconfield';
import { InputIconModule } from '@openng/optimus-ui/inputicon';
import { InputTextModule } from '@openng/optimus-ui/inputtext';

@Component({
  selector: 'app-apps-popup',
  imports: [ButtonModule, FormsModule, InputTextModule, IconFieldModule, InputIconModule],
  templateUrl: './apps-popup.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AppsPopup implements OnInit {
  readonly closePopup = output();
  readonly #navigationService = inject(NavigationsApi);
  readonly #commonService = inject(Common);
  readonly #cd = inject(ChangeDetectorRef);
  protected searchQuery = '';
  protected apps: OperationalMenu[] = [];
  protected topMenus = signal<Module[]>([]);

  async ngOnInit() {
    this.topMenus.set(this.#navigationService.topMenus());

    const loginInfo: LoginInfo = await this.#commonService.getLoginInfo();
    console.log(loginInfo.commonItems);

    if (loginInfo) {
      // this.apps = (loginInfo.operationalMenus[0] as any).reduce(
      //   (unique: OperationalMenu[], module: OperationalMenu) => {
      //     if (!unique.some(x => x.moduleId === module.moduleId)) {
      //       unique.push(module);
      //     }
      //     return unique;
      //   },
      //   []
      // );

      this.#cd.markForCheck();
      console.log('🪟 apps[]:', this.apps);
    }
  }

  get filteredApps(): OperationalMenu[] {
    return [];
    // return this.apps.filter(
    //   app =>
    //     this.searchQuery === '' || app.module.toLowerCase().includes(this.searchQuery.toLowerCase())
    // );
  }

  async onAppClick(e: Event, app: Module) {
    console.log('👉 onAppClick():', e, app);
    e.stopPropagation();
    e.preventDefault();

    this.closePopup.emit();

    // Build and set the structured side menu based on the clicked app's module ID
    // await this.#navigationService.buildStructuredSideMenu(app.moduleId);
  }
}
