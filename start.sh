LOOPS=0
while true; do
    if [ ${LOOPS} -gt 0 ]; then
	    echo "Restarted $LOOPS times"
	fi
	npm start
	echo "To escape the loop, press CTRL+C now. Otherwise, wait 5 seconds for the bot to restart."
	sleep 5
	((LOOPS++))
done