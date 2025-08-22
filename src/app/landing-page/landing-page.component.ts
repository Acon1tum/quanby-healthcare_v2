import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../shared/header/header.component';

@Component({
  selector: 'app-landing-page',
  imports: [CommonModule, HeaderComponent],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss'
})
export class LandingPageComponent {
  constructor(private router: Router) {}

  navigateToFaceScan(): void {
    this.router.navigate(['/face-scan']);
  }
}
