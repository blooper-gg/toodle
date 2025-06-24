# Fonts

You can generate your own msdf fonts using [Don McCurdy's msdf font generator](https://msdf-bmfont.donmccurdy.com/).

1. Download the .ttf file from [Google Fonts](https://fonts.google.com/) or any other source.
2. Visit https://msdf-bmfont.donmccurdy.com/
3. Paste in the character set you need. For all ascii characters, you can use this:

```
 !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}~
```

4. Set the texture size to 512x512 and click generate. If it warns about multiple textures, set to 1024x1024.
5. Download the generated .json and .png files and place them somewhere accessible on the internet (eg in your `public` directory for a vite app).