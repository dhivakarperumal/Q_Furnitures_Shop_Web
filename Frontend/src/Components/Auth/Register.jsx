import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Headphones,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  Truck,
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
    <main className="relative isolate grid min-h-dvh bg-white selection:bg-primary selection:text-white md:grid-cols-[0.9fr_0.6fr]">
      <div className="absolute inset-0 -z-10 overflow-hidden md:hidden">
        <img
          src="/images/register.png"
          alt=""
          className="h-full w-full object-cover object-[35%_center]"
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <section
        aria-label="Q Furnitures"
        className="relative hidden min-h-dvh overflow-hidden md:block"
        style={{ width: "calc(100% + 80px)" }}
      >
        <img
          src="/images/register.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-left"
        />
        <div
          className="absolute inset-0"
          style={{ backdropFilter: "blur(1px)", backgroundColor: "rgba(0, 0, 0, 0.20)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-secondary-dark/65 via-transparent to-primary/10" />
        <div
          className="relative flex min-h-dvh flex-col p-6 xl:p-10"
          style={{ width: "calc(100% - 80px)" }}
        >
          <div className="ml-15 mt-25 flex flex-1 flex-col items-start justify-center px-2 text-left">
            <p className="mb-10 rounded-full border border-orange-200/80 bg-orange-600/90 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-lg">
              Furniture for everyday living
            </p>
            <h2 className="text-3xl font-black tracking-tight text-white drop-shadow-lg xl:text-4xl">
              Comfort for <span className="text-[#fff0b3]">Every Room</span>
            </h2>
            <p className="mt-3 mb-8 max-w-md text-sm font-medium leading-6 text-white drop-shadow-md">
              Find inspiring furniture for living, dining, and restful spaces, bringing comfort and
              style into everyday life.
            </p>
            <div className="mt-2 flex flex-wrap justify-start gap-2 text-xs font-semibold text-white">
              <span className="rounded-full border border-orange-100 bg-orange-100 px-3 py-1.5 text-orange-900 shadow-md">Living room</span>
              <span className="rounded-full border border-orange-100 bg-orange-100 px-3 py-1.5 text-orange-900 shadow-md">Dining</span>
              <span className="rounded-full border border-orange-100 bg-orange-100 px-3 py-1.5 text-orange-900 shadow-md">Bedroom</span>
            </div>
          </div>
          <div className="pt-8 text-center">
            <h2 className="text-3xl font-black tracking-tight text-white xl:text-4xl">
              Join Q Furnitures
            </h2>
            <div className="mt-6 grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center gap-2 text-center text-white">
                <Truck size={26} strokeWidth={1.8} aria-hidden="true" />
                <span className="text-xs font-semibold sm:text-sm">Fast Delivery</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-white">
                <ShieldCheck size={26} strokeWidth={1.8} aria-hidden="true" />
                <span className="text-xs font-semibold sm:text-sm">Safe &amp; Secure</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-white">
                <Headphones size={26} strokeWidth={1.8} aria-hidden="true" />
                <span className="text-xs font-semibold sm:text-sm">Dedicated Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 flex min-h-dvh items-center justify-center bg-white/65 px-4 py-8 sm:px-2 md:bg-transparent md:px-2">
        <div
          aria-hidden="true"
          className="absolute inset-0 hidden bg-white md:block"
          style={{ borderTopLeftRadius: "80px", borderBottomLeftRadius: "80px" }}
        />
        <section className="relative z-10 w-full min-w-0 max-w-sm rounded-[28px] border border-white/90 bg-white/95 p-4 shadow-[0_24px_70px_rgba(53,29,14,0.16)] backdrop-blur-xl sm:p-2 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
          <header className="mb-5 text-center">
            <h1 className="text-3xl font-black tracking-tight text-secondary-dark sm:text-4xl">
              Create an <span className="text-primary">Account</span>
            </h1>
            <p className="mt-2 text-sm text-stone-600 sm:text-base">
              Register now to explore our furniture collection, place orders and track them easily.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-3">
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
                  placeholder="Full Name"
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
                  placeholder="Email Address"
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
                  placeholder="Mobile Number"
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
                  placeholder="Password"
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
                  placeholder="Confirm Password"
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
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark py-3 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserRound size={17} aria-hidden="true" />
              {submitting ? "Creating account..." : "Register"}
            </button>

            <p className="pt-1 text-center text-sm text-stone-600">
              Already have an account?{" "}
              <Link to="/login" className="font-bold text-primary-dark transition hover:underline">
                Login
              </Link>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}

export default Register;
