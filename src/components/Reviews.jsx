import React from 'react';
import { Star, User, ThumbsUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const Reviews = ({ rating, reviewCount }) => {
  // Mock data for reviews since backend doesn't provide them yet
  const mockReviews = [
    {
      id: 1,
      author: "Sarah Mitchell",
      date: "October 15, 2023",
      rating: 5,
      title: "Absolutely stunning experience",
      content: "The views were breathtaking and the service was impeccable. I've stayed in many luxury hotels, but this one stands out. The breakfast buffet was a highlight!",
      helpful: 12
    },
    {
      id: 2,
      author: "James Wilson",
      date: "September 28, 2023",
      rating: 5,
      title: "Perfect getaway",
      content: "We came here for our anniversary and it exceeded all expectations. The room was spacious and clean, and the staff went above and beyond to make our stay special.",
      helpful: 8
    },
    {
      id: 3,
      author: "Elena Rodriguez",
      date: "September 10, 2023",
      rating: 4,
      title: "Great location, lovely rooms",
      content: "The location is perfect for exploring the city. The rooms are beautifully designed. Only giving 4 stars because the check-in process was a bit slow, but otherwise fantastic.",
      helpful: 5
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Overall Rating Card */}
        <div className="w-full md:w-1/3 bg-card border border-border rounded-xl p-6">
          <div className="text-center mb-6">
            <div className="text-5xl font-display font-medium mb-2">{rating}</div>
            <div className="flex justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  className={`w-5 h-5 ${star <= Math.round(rating) ? 'fill-primary text-primary' : 'text-muted-foreground'}`} 
                />
              ))}
            </div>
            <div className="text-muted-foreground text-sm">Based on {reviewCount}+ verified reviews</div>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Cleanliness', score: 9.8 },
              { label: 'Location', score: 9.6 },
              { label: 'Service', score: 9.5 },
              { label: 'Comfort', score: 9.7 },
              { label: 'Value', score: 9.2 }
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-medium">{item.score}</span>
                </div>
                <Progress value={item.score * 10} className="h-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Reviews List */}
        <div className="flex-1 space-y-6">
          <h3 className="font-display text-xl font-medium">Guest Reviews</h3>
          
          {mockReviews.map((review) => (
            <div key={review.id} className="border-b border-border pb-6 last:border-0">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium">{review.author}</div>
                    <div className="text-xs text-muted-foreground">{review.date}</div>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      className={`w-4 h-4 ${star <= review.rating ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} 
                    />
                  ))}
                </div>
              </div>
              
              <h4 className="font-medium mb-2">{review.title}</h4>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                {review.content}
              </p>
              
              <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ThumbsUp className="w-3.5 h-3.5" />
                Helpful ({review.helpful})
              </button>
            </div>
          ))}
          
          <button className="w-full py-3 border border-border rounded-lg text-sm font-medium hover:bg-secondary transition-colors">
            View All Reviews
          </button>
        </div>
      </div>
    </div>
  );
};

export default Reviews;
