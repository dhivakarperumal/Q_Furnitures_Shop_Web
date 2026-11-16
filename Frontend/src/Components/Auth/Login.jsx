import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BadgeCheck, Eye, EyeOff, Headphones, LockKeyhole, ShieldCheck, Truck, UserRound } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { toast } from "react-hot-toast";
import api from "../../api";
import { AuthContext } from "../../PrivateRouter/AuthContext";

function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const completeLogin = (user, token) => {
    login(user, token);
    navigate(user.role === "admin" ? "/admin" : "/", { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/login", form);
      completeLogin(data.user, data.token);
      toast.success("Login successful!");
    } catch (error) {
      console.error("Login Error:", error);
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccess = async (credentialResponse) => {
    try {
      const { data } = await api.post("/auth/google-login", {
        credential: credentialResponse.credential,
      });
      completeLogin(data.user, data.token);
      toast.success("Google Login Successful!");
    } catch (error) {
      console.error("Google Login Error:", error);
      toast.error(error.response?.data?.message || error.message || "Google Login Failed");
    }
  };

  return (
    <main className="relative isolate grid min-h-dvh overflow-hidden bg-[#faf5ef] selection:bg-primary selection:text-white lg:grid-cols-[1.08fr_0.60fr]">
      <div className="absolute inset-0 -z-10 lg:hidden">
        <img
          src="/images/register.png"
          alt=""
          className="h-full w-full object-cover object-[35%_center]"
          style={{ filter: "blur(1.5px)", transform: "scale(1.015)" }}
        />
        <div className="absolute inset-0 bg-black/25" />
      </div>

      <section
        aria-label="Q Living Furniture"
        className="relative hidden min-h-dvh overflow-hidden lg:block"
        style={{ width: "calc(100% + 100px)" }}
      >
        <img
          src="/images/register.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-left"
          style={{ filter: "blur(1.5px)", transform: "scale(1.015)" }}
        />
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-secondary-dark/10" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#faf5ef]/45 to-transparent" />
        <div
          className="relative flex min-h-dvh flex-col justify-between p-12 xl:p-16"
          style={{ width: "calc(100% - 100px)" }}
        >
          <div className="max-w-xl pl-14 mt-15 pt-6 sm:pl-16 xl:pl-20 xl:pt-10">
            <p className="mb-8  inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-white/75 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-secondary-dark shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Q Living Furniture
            </p>
            <h2
              className="max-w-lg text-4xl font-black leading-[1.12] tracking-tight text-white xl:text-[3.5rem]"
              style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.75)" }}
            >
              Make your home feel like <span className="text-orange-100">home.</span>
            </h2>
            <p
              className="mt-4 max-w-md text-base leading-7 text-white xl:text-lg"
              style={{ textShadow: "0 2px 6px rgba(0, 0, 0, 0.75)" }}
            >
              Thoughtful furniture, everyday comfort, and timeless style for the place you love most.
            </p>
          </div>
          <div className="mt-8 pb-4 text-center">
            <h3
              className="text-2xl font-black tracking-tight text-white xl:text-3xl"
              style={{ textShadow: "0 2px 8px rgba(0, 0, 0, 0.75)" }}
            >
              Good to have you back
            </h3>
            <div className="mt-5 grid w-full grid-cols-4 gap-3">
              <div className="flex flex-col items-center gap-2 text-center text-white">
                <Truck size={26} strokeWidth={1.8} aria-hidden="true" />
                <span className="text-xs font-semibold sm:text-sm">Fast Delivery</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-center text-white">
                <ShieldCheck size={26} strokeWidth={1.8} aria-hidden="true" />
                <span className="text-xs font-semibold sm:text-sm">Safe &amp; Secure</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-center text-white">
                <Headphones size={26} strokeWidth={1.8} aria-hidden="true" />
                <span className="text-xs font-semibold sm:text-sm">24/7 Support</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-center text-white">
                <BadgeCheck size={26} strokeWidth={1.8} aria-hidden="true" />
                <span className="text-xs font-semibold sm:text-sm">Quality Furniture</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 flex min-h-dvh items-center justify-center bg-[#faf5ef]/65 px-4 py-5 sm:px-8 lg:bg-transparent lg:px-10">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden">
          <span className="absolute -right-20 top-16 h-72 w-72 rounded-full bg-orange-200/35 blur-3xl" />
          <span className="absolute bottom-8 left-8 h-56 w-56 rounded-full bg-amber-100/70 blur-3xl" />
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 hidden bg-white lg:block"
          style={{ borderTopLeftRadius: "100px 85px", borderBottomLeftRadius: "100px 85px" }}
        />
        <section className="relative z-10 w-full min-w-0 max-w-[430px] p-4 sm:p-8">
          <div className="mb-5 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-primary-dark ring-1 ring-orange-100">
              <LockKeyhole size={25} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-dark">
              Q Living Furniture
            </p>
            <h1 className="text-3xl font-black tracking-tight text-secondary-dark">
              Welcome <span className="text-primary">back</span>
            </h1>
            <p className="mt-1.5 text-sm text-stone-600">
              Sign in to continue to your furniture account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-identifier" className="mb-1.5 block text-sm font-semibold text-secondary-dark">
                Username, email, or mobile number
              </label>
              <div className="relative">
                <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={19} aria-hidden="true" />
                <input
                  id="login-identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  placeholder="Enter your username, email, or mobile"
                  value={form.identifier}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-12 pr-4 text-sm text-secondary-dark outline-none transition placeholder:text-stone-400 focus:border-primary focus:ring-4 focus:ring-orange-100"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-secondary-dark">
                Password
              </label>
              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={19} aria-hidden="true" />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-12 pr-12 text-sm text-secondary-dark outline-none transition placeholder:text-stone-400 focus:border-primary focus:ring-4 focus:ring-orange-100"
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

            <div className="flex items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-600">
                <input type="checkbox" className="h-4 w-4 rounded accent-primary" />
                Remember me
              </label>
              <a href="#" className="text-sm font-semibold text-primary-dark transition hover:underline">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark py-3 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LockKeyhole size={17} aria-hidden="true" />
              {submitting ? "Signing in..." : "Sign in"}
            </button>

            <div className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-stone-200" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-400">or continue with</span>
              <span className="h-px flex-1 bg-stone-200" />
            </div>

            <div className="flex w-full min-w-0 justify-center [&>div]:justify-center">
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={() => toast.error("Google sign-in could not be completed.")}
                type="standard"
                theme="outline"
                size="large"
                shape="rectangular"
                width="250"
                logo_alignment="center"
              />
            </div>

            <p className="pt-1 text-center text-sm text-stone-600">
              New to Q Living?{" "}
              <Link to="/register" className="font-bold text-primary-dark transition hover:underline">
                Create an account
              </Link>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}

export default Login;
