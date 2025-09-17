
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";

const BlocksClassification = () => {
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate("/cancellation-policy");
  };

  return (
    <PageLayout compact title="">
      <div className="w-full flex flex-col items-center">
        <h2 className="text-center text-3xl font-bold mb-6 animate-slide-down">
          Classification of the blocks we offer and flexibility in Scheduling
        </h2>
        
        <div className="text-left space-y-6 max-w-md animate-fade-in">
          <p className="text-center">
            At Laundryheap, we classify the blocks based on the average distance between blocks.
            This is classification is referred to as density.
          </p>
          
          <ul className="space-y-4 list-disc pl-6">
            <li>
              High-density blocks have tasks close to each other, with a higher number of minimum or included tasks to be completed within the hours scheduled.
            </li>
            
            <li>
              Medium-density blocks have tasks slightly farther from each other and fewer included tasks to be completed.
            </li>
            
            <li>
              Low-density blocks have tasks farther from each other and the fewest included tasks to be completed among the 3.
            </li>
          </ul>
          
          <p className="mt-6">
            Please note that blocks are published by us on a weekly basis. You will have complete autonomy to pick blocks as per your schedule and availability via the LH driver app
          </p>
        </div>
        
        <Button 
          onClick={handleContinue}
          className="w-full max-w-xs mt-4 md:mt-8"
        >
          I understand the densities and flexibility in scheduling
        </Button>
      </div>
    </PageLayout>
  );
};

export default BlocksClassification;
