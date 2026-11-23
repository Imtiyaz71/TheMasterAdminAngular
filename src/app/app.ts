import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Course, Order, Stats, Testimonial } from './services/api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private api = inject(ApiService);

  isLoggedIn = signal<boolean>(false);
  activeTab = signal<'dashboard' | 'courses' | 'orders' | 'testimonials'>('dashboard');

  // Auth state - Default credentials
  loginEmail = 'abc@bd.com';
  loginPassword = '123';
  authError = signal<string>('');
  authLoading = signal<boolean>(false);

  // Stats state
  stats = signal<Stats | null>(null);

  // Courses state
  courses = signal<Course[]>([]);
  showCourseModal = signal<boolean>(false);
  isEditingCourse = signal<boolean>(false);
  selectedCourseId: number | null = null;
  courseForm: Course = this.getEmptyCourse();
  isUploadingThumbnail = signal<boolean>(false);
  thumbnailFitMode = signal<'cover' | 'contain'>('cover');
  uploadError = signal<string>('');

  // Testimonials state
  testimonials = signal<Testimonial[]>([]);
  showTestimonialModal = signal<boolean>(false);
  isEditingTestimonial = signal<boolean>(false);
  selectedTestimonialId: number | null = null;
  testimonialForm: Testimonial = this.getEmptyTestimonial();
  isUploadingAvatar = signal<boolean>(false);

  // Orders state
  orders = signal<Order[]>([]);
  orderFilter = signal<'ALL' | 'PENDING' | 'GRANTED'>('ALL');

  // Toast notification
  toastMessage = signal<string>('');

  ngOnInit() {
    const token = localStorage.getItem('tm_admin_token');
    if (token) {
      this.isLoggedIn.set(true);
      this.loadAllData();
    }
  }

  login() {
    this.authLoading.set(true);
    this.authError.set('');

    this.api.login(this.loginEmail, this.loginPassword).subscribe({
      next: (res) => {
        this.authLoading.set(false);
        const data = res?.data !== undefined ? res.data : res;
        if (data?.role !== 'Admin') {
          this.authError.set('Access restricted: Only administrator accounts can access this panel.');
          return;
        }
        localStorage.setItem('tm_admin_token', data.token);
        localStorage.setItem('tm_admin_name', data.fullName);
        this.isLoggedIn.set(true);
        this.loadAllData();
        this.showToast('Welcome back, Admin!');
      },
      error: (err) => {
        this.authLoading.set(false);
        this.authError.set(err.error?.message || 'Invalid credentials or server connection failed.');
      }
    });
  }

  logout() {
    localStorage.removeItem('tm_admin_token');
    localStorage.removeItem('tm_admin_name');
    this.isLoggedIn.set(false);
  }

  loadAllData() {
    this.loadStats();
    this.loadCourses();
    this.loadOrders();
    this.loadTestimonials();
  }

  loadStats() {
    this.api.getDashboardStats().subscribe({
      next: (res) => this.stats.set(res),
      error: (err) => console.error('Failed to load stats:', err)
    });
  }

  loadCourses() {
    this.api.getCourses(false).subscribe({
      next: (res) => this.courses.set(res),
      error: (err) => console.error('Failed to load courses:', err)
    });
  }

  loadOrders() {
    this.api.getOrders().subscribe({
      next: (res) => this.orders.set(res),
      error: (err) => console.error('Failed to load orders:', err)
    });
  }

  loadTestimonials() {
    this.api.getTestimonials(false).subscribe({
      next: (res) => this.testimonials.set(res),
      error: (err) => console.error('Failed to load testimonials:', err)
    });
  }

  // Course actions
  openCreateCourseModal() {
    this.isEditingCourse.set(false);
    this.selectedCourseId = null;
    this.courseForm = this.getEmptyCourse();
    this.showCourseModal.set(true);
  }

  openEditCourseModal(c: Course) {
    this.isEditingCourse.set(true);
    this.selectedCourseId = c.id || null;
    this.courseForm = { ...c };
    this.showCourseModal.set(true);
  }

  closeCourseModal() {
    this.showCourseModal.set(false);
  }

  onThumbnailSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.uploadError.set('');

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit.');
      return;
    }

    this.isUploadingThumbnail.set(true);

    // Instant local preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.courseForm.thumbnailUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);

    this.api.uploadThumbnail(file).subscribe({
      next: (res) => {
        this.isUploadingThumbnail.set(false);
        if (res && res.url) {
          this.courseForm.thumbnailUrl = res.url;
        }
        this.showToast('Thumbnail uploaded and auto-fitted successfully!');
      },
      error: (err) => {
        this.isUploadingThumbnail.set(false);
        console.warn('API upload error, using local image data:', err);
      }
    });
  }

  toggleFitMode() {
    this.thumbnailFitMode.update(mode => mode === 'cover' ? 'contain' : 'cover');
  }

  removeThumbnail() {
    this.courseForm.thumbnailUrl = '';
  }

  saveCourse() {
    if (!this.courseForm.title || !this.courseForm.subject || !this.courseForm.driveFolderLink) {
      alert('Please fill in Title, Subject, and Google Drive Folder Link.');
      return;
    }

    // Ensure all numeric and nullable fields are properly formatted
    const payload: Course = {
      ...this.courseForm,
      title: this.courseForm.title.trim(),
      subject: this.courseForm.subject.trim(),
      price: Number(this.courseForm.price) || 0,
      discountPrice: (this.courseForm.discountPrice !== null && this.courseForm.discountPrice !== undefined && (this.courseForm.discountPrice as any) !== '')
        ? Number(this.courseForm.discountPrice)
        : undefined,
      validityDays: Number(this.courseForm.validityDays) || 365,
      totalVideos: Number(this.courseForm.totalVideos) || 0,
      description: this.courseForm.description?.trim() || '',
      driveFolderLink: this.courseForm.driveFolderLink.trim(),
      thumbnailUrl: this.courseForm.thumbnailUrl?.trim() || undefined
    };

    if (this.isEditingCourse() && this.selectedCourseId) {
      this.api.updateCourse(this.selectedCourseId, payload).subscribe({
        next: () => {
          this.showToast('Course updated successfully!');
          this.closeCourseModal();
          this.loadCourses();
          this.loadStats();
        },
        error: (err) => {
          const msg = err.error?.message || (Array.isArray(err.error?.errors) ? err.error.errors.join(', ') : err.message);
          alert('Failed to update course: ' + msg);
        }
      });
    } else {
      this.api.createCourse(payload).subscribe({
        next: () => {
          this.showToast('New course published successfully!');
          this.closeCourseModal();
          this.loadCourses();
          this.loadStats();
        },
        error: (err) => {
          const msg = err.error?.message || (Array.isArray(err.error?.errors) ? err.error.errors.join(', ') : err.message);
          alert('Failed to create course: ' + msg);
        }
      });
    }
  }

  deleteCourse(id?: number) {
    if (!id) return;
    if (confirm('Are you sure you want to delete this course?')) {
      this.api.deleteCourse(id).subscribe({
        next: () => {
          this.showToast('Course removed.');
          this.loadCourses();
          this.loadStats();
        },
        error: (err) => alert('Delete failed: ' + (err.error?.message || err.message))
      });
    }
  }

  // Order & Drive access actions
  toggleDriveAccess(order: Order, newStatus: 'Granted' | 'Pending') {
    this.api.updateDriveAccess(order.id, newStatus).subscribe({
      next: () => {
        this.showToast(`Drive access marked as "${newStatus}" for ${order.userFullName}`);
        this.loadOrders();
        this.loadStats();
      },
      error: (err) => alert('Failed to update access: ' + (err.error?.message || err.message))
    });
  }

  resendEmail(order: Order) {
    this.api.resendAccessEmail(order.id).subscribe({
      next: () => {
        this.showToast(`Drive access link email resent to ${order.userEmail}!`);
      },
      error: (err) => alert('Email send failed: ' + (err.error?.message || err.message))
    });
  }

  get filteredOrders(): Order[] {
    const list = this.orders();
    const f = this.orderFilter();
    if (f === 'PENDING') return list.filter(o => o.driveAccessStatus === 'Pending' && o.paymentStatus === 'Paid');
    if (f === 'GRANTED') return list.filter(o => o.driveAccessStatus === 'Granted');
    return list;
  }

  showToast(msg: string) {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set('');
    }, 4000);
  }

  private getEmptyCourse(): Course {
    return {
      title: '',
      subject: '',
      description: '',
      thumbnailUrl: '',
      price: 2500,
      discountPrice: 1999,
      validityDays: 365,
      totalVideos: 25,
      driveFolderLink: 'https://drive.google.com/drive/folders/',
      isPublished: true
    };
  }

  // Testimonial actions
  openCreateTestimonialModal() {
    this.isEditingTestimonial.set(false);
    this.selectedTestimonialId = null;
    this.testimonialForm = this.getEmptyTestimonial();
    this.showTestimonialModal.set(true);
  }

  openEditTestimonialModal(t: Testimonial) {
    this.isEditingTestimonial.set(true);
    this.selectedTestimonialId = t.id || null;
    this.testimonialForm = { ...t };
    this.showTestimonialModal.set(true);
  }

  closeTestimonialModal() {
    this.showTestimonialModal.set(false);
  }

  onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit.');
      return;
    }

    this.isUploadingAvatar.set(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      this.testimonialForm.avatarUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);

    this.api.uploadTestimonialAvatar(file).subscribe({
      next: (res) => {
        this.isUploadingAvatar.set(false);
        if (res && res.url) {
          this.testimonialForm.avatarUrl = res.url;
        }
        this.showToast('Student avatar uploaded successfully!');
      },
      error: (err) => {
        this.isUploadingAvatar.set(false);
        console.warn('Avatar upload error, using local image preview:', err);
      }
    });
  }

  removeAvatar() {
    this.testimonialForm.avatarUrl = '';
  }

  saveTestimonial() {
    if (!this.testimonialForm.studentName?.trim() || !this.testimonialForm.designation?.trim() || !this.testimonialForm.speech?.trim()) {
      alert('Please fill in Student Name, Designation / Track, and Testimonial Speech.');
      return;
    }

    const payload: Testimonial = {
      ...this.testimonialForm,
      studentName: this.testimonialForm.studentName.trim(),
      designation: this.testimonialForm.designation.trim(),
      speech: this.testimonialForm.speech.trim(),
      rating: Number(this.testimonialForm.rating) || 5,
      displayOrder: Number(this.testimonialForm.displayOrder) || 1,
      isActive: Boolean(this.testimonialForm.isActive),
      avatarUrl: this.testimonialForm.avatarUrl?.trim() || undefined
    };

    if (this.isEditingTestimonial() && this.selectedTestimonialId) {
      this.api.updateTestimonial(this.selectedTestimonialId, payload).subscribe({
        next: () => {
          this.showToast('Testimonial updated successfully!');
          this.closeTestimonialModal();
          this.loadTestimonials();
        },
        error: (err) => alert('Failed to update testimonial: ' + (err.error?.message || err.message))
      });
    } else {
      this.api.createTestimonial(payload).subscribe({
        next: () => {
          this.showToast('New testimonial published successfully!');
          this.closeTestimonialModal();
          this.loadTestimonials();
        },
        error: (err) => alert('Failed to create testimonial: ' + (err.error?.message || err.message))
      });
    }
  }

  toggleTestimonialStatus(t: Testimonial) {
    if (!t.id) return;
    const updated: Testimonial = { ...t, isActive: !t.isActive };
    this.api.updateTestimonial(t.id, updated).subscribe({
      next: () => {
        this.showToast(`Testimonial for ${t.studentName} is now ${updated.isActive ? 'Active' : 'Hidden'}`);
        this.loadTestimonials();
      },
      error: (err) => alert('Failed to update status: ' + (err.error?.message || err.message))
    });
  }

  deleteTestimonial(id?: number) {
    if (!id) return;
    if (confirm('Are you sure you want to delete this student testimonial?')) {
      this.api.deleteTestimonial(id).subscribe({
        next: () => {
          this.showToast('Testimonial deleted successfully.');
          this.loadTestimonials();
        },
        error: (err) => alert('Delete failed: ' + (err.error?.message || err.message))
      });
    }
  }

  private getEmptyTestimonial(): Testimonial {
    return {
      studentName: '',
      designation: '',
      speech: '',
      avatarUrl: '',
      rating: 5,
      displayOrder: (this.testimonials().length || 0) + 1,
      isActive: true
    };
  }
}
