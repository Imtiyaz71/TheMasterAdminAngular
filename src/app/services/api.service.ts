import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Course {
  id?: number;
  title: string;
  slug?: string;
  subject: string;
  description: string;
  thumbnailUrl?: string;
  price: number;
  discountPrice?: number | null;
  validityDays: number;
  totalVideos: number;
  driveFolderLink: string;
  isPublished: boolean;
  createdAt?: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  userId: number;
  userFullName: string;
  userEmail: string;
  userPhone?: string;
  courseId: number;
  courseTitle: string;
  driveFolderLink: string;
  amount: number;
  paymentStatus: string;
  driveAccessStatus: string;
  driveAccessGrantedAt?: string;
  transactionId?: string;
  createdAt: string;
}

export interface Testimonial {
  id?: number;
  studentName: string;
  designation: string;
  speech: string;
  avatarUrl?: string;
  rating: number;
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Stats {
  totalRevenue: number;
  totalOrders: number;
  paidOrders: number;
  pendingDriveAccess: number;
  totalCourses: number;
  totalStudents: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);

  // Dynamically reads from assets/env.js window.__env.apiUrl, defaults to http://localhost:5000/api
  public get baseUrl(): string {
    const env = (typeof window !== 'undefined') ? (window as any)?.__env : null;
    if (env && env.apiUrl) {
      return env.apiUrl.replace(/\/+$/, '');
    }
    return 'http://localhost:5000/api';
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('tm_admin_token') || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // Authentication
  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/login`, { email, password }).pipe(
      map(res => (res?.data !== undefined ? res.data : res))
    );
  }

  // Courses
  getCourses(publicOnly: boolean = false): Observable<Course[]> {
    return this.http.get<any>(`${this.baseUrl}/courses?publicOnly=${publicOnly}`).pipe(
      map(res => (res?.data !== undefined ? res.data : res) as Course[])
    );
  }

  createCourse(course: Course): Observable<Course> {
    return this.http.post<any>(`${this.baseUrl}/courses`, course, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(res => (res?.data !== undefined ? res.data : res) as Course)
    );
  }

  updateCourse(id: number, course: Course): Observable<Course> {
    return this.http.put<any>(`${this.baseUrl}/courses/${id}`, course, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(res => (res?.data !== undefined ? res.data : res) as Course)
    );
  }

  uploadThumbnail(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.baseUrl}/courses/upload-thumbnail`, formData, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(res => (res?.data !== undefined ? res.data : res))
    );
  }

  deleteCourse(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/courses/${id}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(res => (res?.data !== undefined ? res.data : res))
    );
  }

  // Testimonials
  getTestimonials(activeOnly: boolean = false): Observable<Testimonial[]> {
    return this.http.get<any>(`${this.baseUrl}/testimonials?activeOnly=${activeOnly}`).pipe(
      map(res => (res?.data !== undefined ? res.data : res) as Testimonial[])
    );
  }

  createTestimonial(testimonial: Testimonial): Observable<Testimonial> {
    return this.http.post<any>(`${this.baseUrl}/testimonials`, testimonial, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(res => (res?.data !== undefined ? res.data : res) as Testimonial)
    );
  }

  updateTestimonial(id: number, testimonial: Testimonial): Observable<Testimonial> {
    return this.http.put<any>(`${this.baseUrl}/testimonials/${id}`, testimonial, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(res => (res?.data !== undefined ? res.data : res) as Testimonial)
    );
  }

  deleteTestimonial(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/testimonials/${id}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(res => (res?.data !== undefined ? res.data : res))
    );
  }

  uploadTestimonialAvatar(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.baseUrl}/testimonials/upload-avatar`, formData, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(res => (res?.data !== undefined ? res.data : res))
    );
  }

  // Admin Orders & Drive Access
  getOrders(): Observable<Order[]> {
    return this.http.get<any>(`${this.baseUrl}/admin/orders`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(res => (res?.data !== undefined ? res.data : res) as Order[])
    );
  }

  updateDriveAccess(orderId: number, status: 'Granted' | 'Pending' | 'Revoked', notes?: string): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/admin/orders/${orderId}/drive-access`, { status, notes }, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(res => (res?.data !== undefined ? res.data : res))
    );
  }

  resendAccessEmail(orderId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/admin/orders/${orderId}/resend-email`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(res => (res?.data !== undefined ? res.data : res))
    );
  }

  getDashboardStats(): Observable<Stats> {
    return this.http.get<any>(`${this.baseUrl}/admin/stats`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(res => (res?.data !== undefined ? res.data : res) as Stats)
    );
  }
}
