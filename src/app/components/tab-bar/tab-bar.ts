import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-tab-bar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './tab-bar.html',
  styleUrls: ['./tab-bar.scss'],
})
export class TabBarComponent {}
