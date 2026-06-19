ALTER TABLE public.sentence_examples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sentence_examples_select_authenticated"
  ON public.sentence_examples FOR SELECT TO authenticated USING (true);
