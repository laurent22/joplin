<?php
    namespace AppBundle\Exception;

    use Exception;
    use Illuminate\Contracts\Debug\ExceptionHandler as ExceptionHandlerContract;
    use Illuminate\Http\Response;

    class ExceptionHandler implements ExceptionHandlerContract {

        protected $handlers = array();


        /**
         * Report or log an exception.
         *
         * @param  \Exception $e
         *
         * @return void
         */
        public function report( Exception $e ) {

        }


        /**
         * Render an exception into an HTTP response.
         *
         * @param  \Illuminate\Http\Request $request
         * @param  \Exception               $e
         *
         * @return \Symfony\Component\HttpFoundation\Response
         */
        public function render( $request, Exception $e ) {
            return new Response( $e->getMessage(), 500 );
        }


        /**
         * Render an exception to the console.
         *
         * @param  \Symfony\Component\Console\Output\OutputInterface $output
         * @param  \Exception                                        $e
         *
         * @return void
         */
        public function renderForConsole( $output, Exception $e ) {
            echo $e->getMessage();
        }

    }