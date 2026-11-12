import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Eye, EyeOff, Footprints } from "lucide-react";
import api from "../../api";

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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    <div className="h-screen w-full font-sans flex flex-col bg-[#faf9f8] relative overflow-hidden">

      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-pink-100/40 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-0 right-[20%] w-[350px] h-[350px] bg-yellow-100/30 rounded-full blur-[80px] pointer-events-none z-0" />

      <svg width="0" height="0" className="absolute">
        <defs>
          <clipPath id="sCurveReg" clipPathUnits="objectBoundingBox">
            <path d="M 0 0 L 0.78 0 Q 1.15 0.5, 0.78 1 L 0 1 Z" />
          </clipPath>
        </defs>
      </svg>

      {/* MAIN CONTENT ROW: Image + Form */}
      <div className="flex flex-1 overflow-hidden">

      {/* LEFT: Sticky Image */}
      <div className="hidden lg:block lg:w-5/12 flex-shrink-0 relative h-full">
        <div className="absolute inset-0 w-[103%] h-full bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-800 z-10" style={{ clipPath: "url(#sCurveReg)" }} />
        <div className="absolute inset-0 w-full h-full z-20" style={{ clipPath: "url(#sCurveReg)" }}>
          <img src="/images/loginbanner.png" alt="Q Furnitures" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-black/20 to-transparent" />
          <div className="absolute bottom-10 left-0 right-[15%] px-10 py-8 z-30">
            <svg className="w-7 h-7 text-yellow-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <h2 className="text-2xl font-serif text-white leading-snug mb-5 tracking-wide">Step Into Style<br />Every Day</h2>
            <div className="flex items-center gap-3">
              <div className="h-px w-8 bg-yellow-500/70" />
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-yellow-400">
                <path d="M12 22C12 22 19 18 19 12C19 9 17 6.5 14.5 5.5C13.5 5.1 12.5 5 12 5C11.5 5 10.5 5.1 9.5 5.5C7 6.5 5 9 5 12C5 18 12 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="h-px w-8 bg-yellow-500/70" />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Scrollable Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 py-2 sm:px-8 lg:px-12 z-10 relative overflow-hidden">
        <div className="w-full max-w-[460px]">

          <div className="text-center mb-2"><div className="flex justify-center mb-1.5 relative">
              <div className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full scale-150" />
              <Footprints size={44} strokeWidth={1.4} className="text-yellow-600 relative z-10" aria-hidden="true" />
            </div>
            
            <p className="text-[11px] text-yellow-700 font-bold tracking-[0.2em] uppercase">Find your next favorite pair</p>
          </div>

          <div className="px-0">
            <div className="text-center mb-3"><h2 className="text-xl font-serif text-primary mb-1">Create Your Account</h2>
              <p className="text-gray-400 text-sm">Join us for shoes, bags, and accessories made for every day.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2.5">

              <div className="group space-y-1">
                <label htmlFor="register-username" className="block text-xs font-semibold text-gray-600">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input id="register-username" name="username" type="text" placeholder="Full Name" onChange={handleChange} className="w-full pl-11 pr-4 py-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 font-medium focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-400" required />
                </div>
              </div>

              <div className="group space-y-1">
                <label htmlFor="register-email" className="block text-xs font-semibold text-gray-600">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input id="register-email" name="email" type="email" placeholder="Email Address" onChange={handleChange} className="w-full pl-11 pr-4 py-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 font-medium focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-400" required />
                </div>
              </div>

              <div className="group space-y-1">
                <label htmlFor="register-phone" className="block text-xs font-semibold text-gray-600">Mobile Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <input id="register-phone" name="phone" type="text" placeholder="Mobile Number" onChange={handleChange} className="w-full pl-11 pr-4 py-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 font-medium focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-400" required />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="group space-y-1">
                <label htmlFor="register-password" className="block text-xs font-semibold text-gray-600">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input id="register-password" type={showPassword ? "text" : "password"} name="password" placeholder="Password" onChange={handleChange} className="w-full pl-11 pr-12 py-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 font-medium focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-400" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors">
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div className="group space-y-1">
                <label htmlFor="register-confirm-password" className="block text-xs font-semibold text-gray-600">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input id="register-confirm-password" type={showConfirmPassword ? "text" : "password"} name="confirmPassword" placeholder="Confirm Password" onChange={handleChange} className="w-full pl-11 pr-12 py-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 font-medium focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-400" required />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors">
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
              </div>

             

              <button type="submit" disabled={submitting} className="w-full py-4 mt-2 rounded-xl text-white font-semibold text-sm tracking-wide bg-gradient-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 relative overflow-hidden group cursor-pointer disabled:cursor-not-allowed disabled:opacity-60">
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  {submitting ? "Creating Account..." : "Create Account"}
                </span>
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </button>

              <div className="flex items-center gap-3 py-0">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest">OR</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

         

              <p className="text-center text-xs text-gray-400 pt-1">
                Already have an account?{" "}
                <Link to="/login" className="text-primary font-bold hover:underline">Login</Link>
              </p>

            </form>
          </div>
        </div>
      </div>
      </div>{/* end MAIN CONTENT ROW */}

     
      <div className="w-full bg-primary border-t border-primary-light/30 shadow-[0_-4px_20px_rgba(0,0,0,0.2)] z-30 flex-shrink-0">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-evenly gap-4">

          {/* Premium Quality */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full border border-yellow-500/50 bg-white/5">
              <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-white leading-tight tracking-wide">Premium Quality</p>
              <p className="text-[10px] text-gray-300 leading-tight mt-0.5">Finest fabrics crafted with care</p>
            </div>
          </div>

          <div className="w-px h-8 bg-white/10 hidden sm:block" />

          {/* Free Shipping */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full border border-yellow-500/50 bg-white/5">
              <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-white leading-tight tracking-wide">Free Shipping</p>
              <p className="text-[10px] text-gray-300 leading-tight mt-0.5">On orders above Ã¢â€šÂ¹999</p>
            </div>
          </div>

          <div className="w-px h-8 bg-white/10 hidden sm:block" />

          {/* Secure Payment */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full border border-yellow-500/50 bg-white/5">
              <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-white leading-tight tracking-wide">Secure Payment</p>
              <p className="text-[10px] text-gray-300 leading-tight mt-0.5">100% safe & trusted</p>
            </div>
          </div>

          <div className="w-px h-8 bg-white/10 hidden sm:block" />

          {/* Easy Returns */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full border border-yellow-500/50 bg-white/5">
              <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-white leading-tight tracking-wide">Easy Returns</p>
              <p className="text-[10px] text-gray-300 leading-tight mt-0.5">Hassle-free returns</p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

export default Register;


