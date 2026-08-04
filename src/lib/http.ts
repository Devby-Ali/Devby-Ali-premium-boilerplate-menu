import axios, { AxiosError, type AxiosResponse } from "axios";

// ------------------------------------------------------------------
//  Base Axios Instance
// ------------------------------------------------------------------
const baseURL =
  (typeof window !== "undefined" ? process.env.NEXT_PUBLIC_API_BASE_URL : undefined) ||
  "/api";

const http = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // ارسال خودکار کوکی (Session) در هر درخواست
});

// ------------------------------------------------------------------
//  Response Interceptor – یکسان‌سازی مدیریت خطا
// ------------------------------------------------------------------
http.interceptors.response.use(
  (response) => {
    // اگر پاسخ در قالب ApiResponse باشد، data را مستقیماً برگردان
    if (response.data && typeof response.data === "object" && "data" in response.data) {
      return response.data.data ?? null; // null اگر data وجود نداشته باشد
    }
    // در غیر این صورت، کل بدنهٔ پاسخ برگردانده شود (backward compatibility)
    return response.data;
  },
  (error: AxiosError<{ error?: string; message?: string }>) => {
    // حالت 401 → کاربر به صفحهٔ ورود هدایت شود (اختیاری، توسط بررسی‌کننده‌های سطح بالا نیز ممکن است)
    if (error.response?.status === 401 && typeof window !== "undefined") {
      // ری‌دایرکت مستقیم از کلاینت (بدون نیاز به Next Router)
      window.location.href = "/admin/login";
    }

    // استخراج پیغام خطا از پاسخ سرور یا fallback مناسب
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "خطای ناشناخته در ارتباط با سرور";

    // بازگرداندن یک Error استاندارد برای استفاده در catch کلاینت
    return Promise.reject(new Error(message));
  }
);

export default http;

// ------------------------------------------------------------------
//  Typed helpers – کمک به Type Safety در فراخوانی‌های کلاینت
// ------------------------------------------------------------------
//  توجه: Interceptor بالا بدنهٔ پاسخ را از قبل Unwrap می‌کند (به `data`
//  در قالب ApiResponse یا کل بدنه در سایر موارد)، اما تایپ axios همچنان
//  `AxiosResponse<T>` را اعلام می‌کند. این توابع صرفاً برای هم‌راستا کردن
//  تایپ TypeScript با رفتار واقعی زمان اجرا استفاده می‌شوند.

/**
 * برای درخواست‌هایی که پاسخ سرور به فرمت استاندارد `ApiResponse<T>`
 * (یعنی `{ data: T }`) است و توسط Interceptor به مقدار `data` واقعی
 * Unwrap می‌شود.
 */
export async function getApiData<T>(
  request: Promise<AxiosResponse<T>>
): Promise<T> {
  return (await request) as unknown as T;
}

/**
 * برای درخواست‌هایی که بدنهٔ پاسخ سرور شکل دلخواه خودش را دارد
 * (مثلاً `{ message, user }`) و به‌صورت کامل توسط Interceptor
 * بازگردانده می‌شود.
 */
export async function getApiPayload<T>(
  request: Promise<AxiosResponse<T>>
): Promise<T> {
  return (await request) as unknown as T;
}
