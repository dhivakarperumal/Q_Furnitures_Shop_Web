import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Eye,
  EyeOff,
  House,
  LockKeyhole,
  Mail,
  PackageCheck,
  Phone,
  ShoppingCart,
  UserRound,
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api";

const inputClass =
  "w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-11 pr-4 text-sm text-secondary-dark outline-none transition placeholder:text-stone-400 focus:border-primary focus:ring-4 focus:ring-orange-100";

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (form.password !== form.confirmPassword) {
      return toast.error("Passwords do not match");
    }
    if (form.password.length < 8 || form.password.length > 72) {
      return toast.error("Password must be between 8 and 72 characters");
    }

    setSubmitting(true);
    try {
      await api.post("/auth/register", {
        username: form.username,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      toast.success("Registration successful! Please login.");
      navigate("/login");
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative isolate grid min-h-dvh overflow-hidden bg-[#faf5ef] selection:bg-primary selection:text-white lg:grid-cols-[1.05fr_0.95fr]">
      <div className="absolute inset-0 -z-10 lg:hidden">
        <img
          src="/images/loginbg.png"
          alt=""
          className="h-full w-full object-cover object-[35%_center]"
        />
        <div className="absolute inset-0 bg-[#faf5ef]/70" />
      </div>

      <section aria-label="Q Furnitures" className="relative hidden min-h-dvh overflow-hidden lg:block">
        <img
          src="/images/loginbg.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-left"
        />
        <div
          className="absolute inset-0"
          style={{ backdropFilter: "blur(1px)", backgroundColor: "rgba(0, 0, 0, 0.10)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-secondary-dark/10" />
        <div className="relative flex min-h-dvh flex-col p-8 xl:p-14">
          <div
            className="mx-auto w-full max-w-lg text-center"
            style={{ marginLeft: "auto", marginRight: "auto", marginTop: "auto", marginBottom: "auto" }}
          >
            <Link to="/" className="inline-flex items-center justify-center gap-3 text-secondary-dark">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-orange-200">
                <House size={27} strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="text-center">
                <span className="block text-3xl font-black leading-none tracking-tight">
                  <span className="text-primary">Q</span> Furnitures
                </span>
                <span className="mt-1 block text-sm font-semibold tracking-wide text-secondary-dark/80">
                  Furniture Store Management
                </span>
              </span>
            </Link>

            <h2 className="mx-auto mt-8 max-w-md text-center text-3xl font-black leading-tight tracking-tight text-secondary-dark xl:text-4xl">
              Furniture store management, made simple.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-center text-base leading-7 text-secondary-dark/80">
              Keep your products, orders, and business insights organized in one place.
            </p>
          </div>

          <div className="mx-auto mt-8 grid w-full max-w-2xl grid-cols-3 gap-3 pb-2">
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-orange-200">
                <PackageCheck size={20} aria-hidden="true" />
              </span>
              <span className="text-xs font-semibold leading-5 text-secondary-dark sm:text-sm">Manage Products &amp; Inventory</span>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-orange-200">
                <ShoppingCart size={20} aria-hidden="true" />
              </span>
              <span className="text-xs font-semibold leading-5 text-secondary-dark sm:text-sm">Orders &amp; Billing</span>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-orange-200">
                <BarChart3 size={20} aria-hidden="true" />
              </span>
              <span className="text-xs font-semibold leading-5 text-secondary-dark sm:text-sm">Reports &amp; Insights</span>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 flex min-h-dvh items-center justify-center bg-[#faf5ef]/65 px-4 py-8 sm:px-8 lg:bg-gradient-to-br lg:from-[#fffdfa] lg:via-[#faf5ef] lg:to-[#f5e8d9] lg:px-10">
        <section className="relative w-full min-w-0 max-w-xl rounded-[28px] border border-white/90 bg-white/95 p-4 shadow-[0_24px_70px_rgba(53,29,14,0.16)] backdrop-blur-xl sm:p-6">
          <div
            aria-hidden="true"
            className="absolute inset-x-10 top-0 h-1 rounded-b-full bg-gradient-to-r from-primary/20 via-primary to-primary/20"
          />
          <header className="mb-4 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-primary-dark ring-1 ring-orange-100">
              <UserRound size={23} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-secondary-dark sm:text-3xl">
              Create an <span className="text-primary">Account</span>
            </h1>
            <p className="mt-1.5 text-sm text-stone-600">
              Register to get started with Q Furnitures
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div>
              <label htmlFor="register-username" className="mb-1.5 block text-sm font-semibold text-secondary-dark">
                Full name
              </label>
              <div className="relative">
                <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={19} aria-hidden="true" />
                <input
                  id="register-username"
                  name="username"
                  type="text"
                  autoComplete="name"
                  placeholder="Your full name"
                  value={form.username}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-email" className="mb-1.5 block text-sm font-semibold text-secondary-dark">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={19} aria-hidden="true" />
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-phone" className="mb-1.5 block text-sm font-semibold text-secondary-dark">
                Mobile number
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={19} aria-hidden="true" />
                <input
                  id="register-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="Your mobile number"
                  value={form.phone}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-password" className="mb-1.5 block text-sm font-semibold text-secondary-dark">
                Password
              </label>
              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={19} aria-hidden="true" />
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={handleChange}
                  className={`${inputClass} pr-12`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 transition hover:text-primary-dark"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="register-confirm-password" className="mb-1.5 block text-sm font-semibold text-secondary-dark">
                Confirm password
              </label>
              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={19} aria-hidden="true" />
                <input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className={`${inputClass} pr-12`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 transition hover:text-primary-dark"
                >
                  {showConfirmPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserRound size={17} aria-hidden="true" />
              {submitting ? "Creating account..." : "Create account"}
            </button>

            <p className="pt-1 text-center text-sm text-stone-600">
              Already have an account?{" "}
              <Link to="/login" className="font-bold text-primary-dark transition hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}

export default Register;
