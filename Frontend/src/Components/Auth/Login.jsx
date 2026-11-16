import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
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
    <main className="relative isolate flex min-h-dvh items-center overflow-hidden bg-[#faf5ef] px-4 py-4 selection:bg-primary selection:text-white sm:px-8 sm:py-5">
      <img
        src="/images/loginbg.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[left_center]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/40 lg:to-[#faf5ef]/80" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1500px] items-center justify-center lg:justify-end lg:px-16">
        <section className="w-full max-w-[430px] rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_70px_rgba(53,29,14,0.18)] backdrop-blur-xl sm:p-9">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-primary-dark ring-8 ring-orange-50/60">
              <LockKeyhole size={28} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary-dark">
              Q Living Furniture
            </p>
            <h1 className="text-3xl font-black tracking-tight text-secondary-dark">
              Welcome <span className="text-primary">back</span>
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              Sign in to continue to your furniture account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  className="w-full rounded-xl border border-stone-200 bg-white py-3.5 pl-12 pr-4 text-sm text-secondary-dark outline-none transition placeholder:text-stone-400 focus:border-primary focus:ring-4 focus:ring-orange-100"
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
                  className="w-full rounded-xl border border-stone-200 bg-white py-3.5 pl-12 pr-12 text-sm text-secondary-dark outline-none transition placeholder:text-stone-400 focus:border-primary focus:ring-4 focus:ring-orange-100"
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
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LockKeyhole size={17} aria-hidden="true" />
              {submitting ? "Signing in..." : "Sign in"}
            </button>

            <div className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-stone-200" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-400">or continue with</span>
              <span className="h-px flex-1 bg-stone-200" />
            </div>

            <div className="flex w-full justify-center [&>div]:w-full [&>div]:justify-center">
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={() => toast.error("Google sign-in could not be completed.")}
                type="standard"
                theme="outline"
                size="large"
                shape="rectangular"
                width="100%"
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
