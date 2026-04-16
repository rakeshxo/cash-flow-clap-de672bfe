-- Surveys table (publicly readable list of available surveys)
CREATE TABLE public.surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reward_cents INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER NOT NULL DEFAULT 5,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  category TEXT NOT NULL DEFAULT 'General',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Surveys are viewable by everyone"
  ON public.surveys FOR SELECT
  USING (true);

-- Completions track who finished what (and pay them)
CREATE TABLE public.survey_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  reward_cents INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, survey_id)
);

ALTER TABLE public.survey_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own completions"
  ON public.survey_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own completions"
  ON public.survey_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Profiles for display name
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed some surveys
INSERT INTO public.surveys (title, description, reward_cents, estimated_minutes, category, questions) VALUES
('Your shopping habits', 'Quick poll about how you shop online.', 75, 3, 'Lifestyle',
 '[{"q":"How often do you shop online?","options":["Daily","Weekly","Monthly","Rarely"]},
   {"q":"Preferred device?","options":["Phone","Laptop","Tablet","Desktop"]},
   {"q":"Biggest factor when buying?","options":["Price","Reviews","Brand","Shipping speed"]}]'::jsonb),
('Streaming preferences', 'Tell us what you watch and how.', 120, 5, 'Entertainment',
 '[{"q":"How many streaming services do you pay for?","options":["0","1-2","3-4","5+"]},
   {"q":"Favorite genre?","options":["Drama","Comedy","Sci-Fi","Documentary"]},
   {"q":"When do you watch most?","options":["Morning","Afternoon","Evening","Late night"]},
   {"q":"Watch on?","options":["TV","Phone","Laptop","Tablet"]}]'::jsonb),
('Coffee or tea?', 'A 1-minute taste test survey.', 40, 1, 'Food',
 '[{"q":"Which do you prefer?","options":["Coffee","Tea","Both","Neither"]},
   {"q":"Cups per day?","options":["0","1","2","3+"]}]'::jsonb),
('Remote work check-in', 'Share your work-from-home experience.', 150, 6, 'Work',
 '[{"q":"Days per week working remotely?","options":["0","1-2","3-4","5"]},
   {"q":"Favorite remote tool?","options":["Slack","Zoom","Notion","Other"]},
   {"q":"Productivity vs office?","options":["Higher","Same","Lower","Mixed"]},
   {"q":"Biggest challenge?","options":["Loneliness","Distractions","Communication","None"]}]'::jsonb),
('Travel dreams', 'Where would you love to go next?', 90, 4, 'Travel',
 '[{"q":"Dream destination type?","options":["Beach","Mountains","City","Countryside"]},
   {"q":"Trip length you prefer?","options":["Weekend","1 week","2 weeks","1 month+"]},
   {"q":"Travel style?","options":["Luxury","Mid-range","Budget","Backpacking"]}]'::jsonb),
('Fitness habits', 'Help us understand your routine.', 60, 3, 'Health',
 '[{"q":"How often do you exercise?","options":["Daily","Few times/week","Weekly","Rarely"]},
   {"q":"Preferred workout?","options":["Cardio","Strength","Yoga","Sports"]}]'::jsonb);
