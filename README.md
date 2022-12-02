Keyzen - Colemak Edition
========================

This is a fork of [Keyzen by wwwtyro](https://github.com/wwwtyro/keyzen), modified for learning the [Colemak](http://colemak.com/) keyboard layout. 

The key sequence focuses on learning the Colemak home row, then gradually introduces keys in the top and bottom rows. Common punctuation and web navigation characters are added to the mix after learning every lowercase letter. Alpha letters and uncommon punctuation marks are added last.

Keyzen automatically adds new characters to the mix as your errors decrease. Click on the character sequence at the top to increase or decrease difficulty.

Hosted Version
--------------

You can use keyzen-colemak without installing it. All you need is an internet connection:

http://first20hours.github.io/keyzen-colemak/

Local Installation
------------------

I recommend installing this program locally on your computer, which allows you to use the program when you're not connected to the net. I use [Pow.cx](http://pow.cx) by 37signals and the [Powder](https://github.com/rodreegez/powder) Ruby gem to make setup and local hosting a breeze.

**Clone keyzen-colemak**

	$ git clone git@github.com:first20hours/keyzen-colemak.git

**Navigate to the new folder**

	$ cd keyzen-colemak

**Install the Powder gem (assuming you have Ruby installed)**

	$ gem install powder

**Install Pow.cx via Powder**

	$ powder install

**Set up keyzen-colemak in Pow**

	$ powder link keyzen

Open http://keyzen.dev in your browser. That's it!

Most modern operating systems have the Colemak keyboard set installed by default. If you're having trouble finding it, Google is your friend. Installation information is also available at [Colemak.com](http://colemak.com/wiki/index.php?title=Download).

Enjoy!
