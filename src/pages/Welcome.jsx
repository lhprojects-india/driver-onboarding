import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Welcome = () => {

const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const { signIn, isLoading } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your registered email address.",
        variant: "destructive",
      });
      return;
    }
    
    const success = await signIn(email);
    if (success) {
      navigate("/verify");
    }
  };

  return (
    <PageLayout title="Laundryheap Driver onboarding">
      <div className="flex-1 text-center">
        <span>
          Welcome to Laundryheap's delivery partner platform. This is an introduction to your Onboarding process.
          <br />
          By proceeding, you should be able to understand the key aspects of the job.
        </span>
      </div>

      <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@laundryheap.com"
                type="email"
                required
              />
              
              <p className="text-center text-sm mt-4 md:mt-6 mb-4 md:mb-6 max-w-xs animate-fade-in">
                Please enter your registered e-mail provided with your application
              </p>
      
              <Button 
                type="submit" 
                className="mt-4 w-full max-w-xs"
                showArrow={true}
              >
                <Mail size={18} />
                {isLoading ? "Sending code..." : "Continue"}
              </Button>
            </form>
    </PageLayout>
  );
};
export default Welcome;
