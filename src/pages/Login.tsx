import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

// Define the user role type
type UserRole = 'Admin' | 'InvoicingUser' | 'ContactMaster';

interface FormData {
  email: string;
  password: string;
  name: string;
  companyName: string;
  role: UserRole;
}

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    name: '',
    companyName: '',
    role: 'Admin',
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.email || !formData.password) {
      toast({
        title: 'Validation Error',
        description: 'Email and password are required',
        variant: 'destructive',
      });
      return;
    }

    if (isSignup && (!formData.name || !formData.companyName)) {
      toast({
        title: 'Validation Error',
        description: 'All fields are required for signup',
        variant: 'destructive',
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    // Password validation
    if (formData.password.length < 6) {
      toast({
        title: 'Validation Error',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Use AuthContext; Supabase is used internally when configured
      if (isSignup) {
        await signup({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          companyName: formData.companyName,
          role: formData.role,
        });
        toast({
          title: 'Account created successfully!',
          description: 'Please check your email to verify your account',
        });
      } else {
        await login(formData.email, formData.password);
        toast({
          title: 'Welcome back!',
          description: 'Logged in successfully',
        });
      }
      navigate('/dashboard');
    } catch (err: unknown) {
      console.error('Authentication error:', err);
      
      let errorMessage = 'Authentication failed. Please check your details and try again.';
      
      if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = (err as { message: string }).message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      toast({
        title: isSignup ? 'Signup failed' : 'Login failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({ ...prev, role: value as UserRole }));
  };

  const toggleAuthMode = () => {
    setIsSignup(!isSignup);
    // Reset form when switching modes
    setFormData({
      email: '',
      password: '',
      name: '',
      companyName: '',
      role: 'Admin',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/10 to-background p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground shadow-lg">
              <Building2 className="h-7 w-7" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Shiv Accounts Cloud</h1>
          <p className="text-muted-foreground mt-1">
            Professional accounting for furniture businesses
          </p>
          {!isSignup && (
            <p className="text-xs text-muted-foreground mt-2">
              Demo login: <code className="bg-muted px-1 rounded">system@shiv</code> / <code className="bg-muted px-1 rounded">super</code>
            </p>
          )}
        </div>

        {/* Auth Form */}
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">
              {isSignup ? 'Create account' : 'Sign in'}
            </CardTitle>
            <CardDescription className="text-center">
              {isSignup 
                ? 'Enter your details to create your account' 
                : 'Enter your credentials to access your account'
              }
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {isSignup && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="pl-10"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="companyName"
                        type="text"
                        placeholder="Enter your company name"
                        value={formData.companyName}
                        onChange={(e) => handleInputChange('companyName', e.target.value)}
                        className="pl-10"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role *</Label>
                    <Select 
                      value={formData.role} 
                      onValueChange={handleRoleChange}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">Admin (Business Owner)</SelectItem>
                        <SelectItem value="InvoicingUser">Invoicing User</SelectItem>
                        <SelectItem value="ContactMaster">Contact Master</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                    autoComplete={isSignup ? 'email' : 'username'}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={isSignup ? "Enter a password (min. 6 characters)" : "Enter your password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    minLength={6}
                  />
                </div>
              </div>

              {!isSignup && (
                <div className="text-right">
                  <Button 
                    variant="link" 
                    className="px-0 text-sm text-primary hover:underline"
                    type="button"
                    disabled={isLoading}
                  >
                    Forgot password?
                  </Button>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Please wait...' : (isSignup ? 'Create account' : 'Sign in')}
              </Button>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">
                  {isSignup ? 'Already have an account?' : "Don't have an account?"}
                </span>
                {' '}
                <Button
                  variant="link"
                  className="px-0 text-sm hover:underline"
                  type="button"
                  onClick={toggleAuthMode}
                  disabled={isLoading}
                >
                  {isSignup ? 'Sign in' : 'Sign up'}
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}